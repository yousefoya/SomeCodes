import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../domain/entities/provider_wallet_entity.dart';
import '../../domain/entities/wallet_transaction_entity.dart';
import '../../domain/entities/bank_account_entity.dart';
import '../../domain/entities/withdrawal_request_entity.dart';
import '../../domain/repositories/finance_repository_interface.dart';

class ApiFinanceRepository implements IFinanceRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiFinanceRepository({
    http.Client? client,
    IAuthLocalDataSource? authLocalDataSource,
  })  : _client = client ?? http.Client(),
        _authLocalDataSource = authLocalDataSource;

  Future<Map<String, String>> _getHeaders() async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_authLocalDataSource != null) {
      final token = await _authLocalDataSource!.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  @override
  Future<ProviderWalletEntity> getMyWallet() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/wallet');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return ProviderWalletEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تحميل بيانات المحفظة المالية');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل المحفظة ($uri): $e');
    }
  }

  @override
  Future<List<WalletTransactionEntity>> getMyTransactions({String? type, int limit = 50}) async {
    final queryParams = <String, String>{'limit': limit.toString()};
    if (type != null && type.isNotEmpty) {
      queryParams['type'] = type;
    }
    final queryString = Uri(queryParameters: queryParams).query;
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/transactions?$queryString');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final list = body['data'] as List<dynamic>? ?? [];
        return list.map((item) => WalletTransactionEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تحميل الحركات المالية');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل القيود المحاسبية ($uri): $e');
    }
  }

  @override
  Future<List<BankAccountEntity>> getMyBankAccounts() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/bank-accounts');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final list = body['data'] as List<dynamic>? ?? [];
        return list.map((item) => BankAccountEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تحميل الحسابات البنكية');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل الحسابات البنكية ($uri): $e');
    }
  }

  @override
  Future<BankAccountEntity> addBankAccount({
    required String bankName,
    required String beneficiaryName,
    required String iban,
    String? swiftCode,
    bool isDefault = true,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/bank-accounts');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      final bodyMap = jsonEncode({
        'bankName': bankName,
        'beneficiaryName': beneficiaryName,
        'iban': iban,
        if (swiftCode != null && swiftCode.isNotEmpty) 'swiftCode': swiftCode,
        'isDefault': isDefault,
      });
      ApiConfig.logRequest('POST', uri, headers: headers, body: bodyMap);

      final response = await _client.post(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return BankAccountEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل إضافة الحساب البنكي');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحفظ الحساب البنكي ($uri): $e');
    }
  }

  @override
  Future<void> deleteBankAccount(String accountId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/bank-accounts/$accountId');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل حذف الحساب البنكي');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف الحساب البنكي ($uri): $e');
    }
  }

  @override
  Future<List<WithdrawalRequestEntity>> getMyWithdrawals() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/withdrawals');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final list = body['data'] as List<dynamic>? ?? [];
        return list.map((item) => WithdrawalRequestEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تحميل طلبات السحب');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل طلبات السحب ($uri): $e');
    }
  }

  @override
  Future<WithdrawalRequestEntity> requestWithdrawal({
    required double amount,
    String? bankAccountId,
    String? bankName,
    String? beneficiaryName,
    String? iban,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me/withdrawals');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      final bodyMap = jsonEncode({
        'amount': amount,
        if (bankAccountId != null) 'bankAccountId': bankAccountId,
        if (bankName != null) 'bankName': bankName,
        if (beneficiaryName != null) 'beneficiaryName': beneficiaryName,
        if (iban != null) 'iban': iban,
      });
      ApiConfig.logRequest('POST', uri, headers: headers, body: bodyMap);

      final response = await _client.post(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return WithdrawalRequestEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تقديم طلب السحب');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتقديم طلب السحب ($uri): $e');
    }
  }
}

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../domain/entities/quotation_entity.dart';

abstract class IQuotationsRepository {
  Future<List<QuotationEntity>> getQuotationsForOrder(String orderId);
  Future<QuotationEntity> approveQuotation(String quotationId);
  Future<QuotationEntity> rejectQuotation(String quotationId, {String? reason});
}

class ApiQuotationsRepository implements IQuotationsRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiQuotationsRepository({
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
  Future<List<QuotationEntity>> getQuotationsForOrder(String orderId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/quotations/order/$orderId');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('GET', uri, headers: headers);
      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>;
        return list.map((item) => QuotationEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل عروض الأسعار.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل عروض الأسعار ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<QuotationEntity> approveQuotation(String quotationId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/quotations/$quotationId/approve');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      ApiConfig.logRequest('POST', uri, headers: headers);
      final response = await _client.post(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return QuotationEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل قبول عرض السعر.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<QuotationEntity> rejectQuotation(String quotationId, {String? reason}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/quotations/$quotationId/reject');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders();
      final bodyStr = jsonEncode({'reason': reason ?? 'رفض من العميل'});
      ApiConfig.logRequest('POST', uri, headers: headers, body: bodyStr);
      final response = await _client.post(uri, headers: headers, body: bodyStr).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return QuotationEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل رفض عرض السعر.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

/// Quotations repository provider
final quotationsRepositoryProvider = Provider<IQuotationsRepository>((ref) {
  final authLocal = ref.watch(authLocalDataSourceProvider);
  return ApiQuotationsRepository(authLocalDataSource: authLocal);
});

/// Order quotations family provider
final orderQuotationsProvider = FutureProvider.family<List<QuotationEntity>, String>((ref, orderId) async {
  final repo = ref.watch(quotationsRepositoryProvider);
  return repo.getQuotationsForOrder(orderId);
});

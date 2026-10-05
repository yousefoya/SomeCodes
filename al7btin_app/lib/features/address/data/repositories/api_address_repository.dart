import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/services/location/location_service_interface.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../domain/repositories/address_repository_interface.dart';

/// Real REST API implementation of IAddressRepository communicating with PostgreSQL backend
class ApiAddressRepository implements IAddressRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiAddressRepository({
    http.Client? client,
    IAuthLocalDataSource? authLocalDataSource,
  })  : _client = client ?? http.Client(),
        _authLocalDataSource = authLocalDataSource;

  Future<Map<String, String>> _getHeaders({bool requireAuth = true}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (requireAuth && _authLocalDataSource != null) {
      final token = await _authLocalDataSource!.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  @override
  Future<List<UserAddress>> getAddresses() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/addresses');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>? ?? [];
        return list.map((item) => UserAddress.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل العناوين.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل العناوين ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<UserAddress?> getAddressById(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/addresses/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return UserAddress.fromJson(body['data'] as Map<String, dynamic>);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل العنوان.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<UserAddress> addAddress(UserAddress address) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/addresses');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(address.toJson());
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client.post(uri, headers: headers, body: encodedBody).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return UserAddress.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إضافة العنوان.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحفظ العنوان ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<UserAddress> updateAddress(UserAddress address) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/addresses/${address.id}');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(address.toJson());
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client.patch(uri, headers: headers, body: encodedBody).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return UserAddress.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث العنوان.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث العنوان ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> deleteAddress(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/addresses/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حذف العنوان.');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف العنوان ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> setDefaultAddress(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/addresses/$id/default');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('PATCH', uri, headers: headers);

      final response = await _client.patch(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعيين العنوان كافتراضي.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعيين العنوان الافتراضي ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

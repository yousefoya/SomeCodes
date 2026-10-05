import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../domain/entities/service_entity.dart';
import '../../domain/entities/dynamic_service_config_entity.dart';
import '../../domain/repositories/service_repository_interface.dart';

class ApiServiceRepository implements IServiceRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiServiceRepository({
    http.Client? client,
    IAuthLocalDataSource? authLocalDataSource,
  })  : _client = client ?? http.Client(),
        _authLocalDataSource = authLocalDataSource;

  Future<Map<String, String>> _getHeaders({bool requireAuth = false}) async {
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
  Future<List<ServiceEntity>> getServices({String? categoryId, bool includeInactive = false}) async {
    final queryParams = <String, String>{};
    if (categoryId != null && categoryId.isNotEmpty) {
      queryParams['categoryId'] = categoryId;
    }
    if (includeInactive) {
      queryParams['active'] = 'all';
    }

    final uri = Uri.parse('${ApiConfig.baseUrl}/services').replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>;
        return list.map((item) => ServiceEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل الخدمات.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل الخدمات ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ServiceEntity?> getServiceById(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/$id');
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return ServiceEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<List<ServiceEntity>> searchServices(String query) async {
    if (query.trim().isEmpty) return getServices();

    final uri = Uri.parse('${ApiConfig.baseUrl}/services').replace(queryParameters: {'search': query.trim()});
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>;
        return list.map((item) => ServiceEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل البحث عن الخدمات.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ServiceEntity> addService(ServiceEntity service) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/admin');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(service.toJson());
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client
          .post(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return ServiceEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إضافة الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإضافة الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ServiceEntity> updateService(ServiceEntity service) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/admin/${service.id}');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(service.toJson());
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client
          .patch(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return ServiceEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعديل الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعديل الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> deleteService(String serviceId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/admin/$serviceId');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حذف الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ServiceOptionEntity> addServiceOption(String serviceId, ServiceOptionEntity option) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/admin/$serviceId/options');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(option.toJson());
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client
          .post(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return ServiceOptionEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إضافة خيار الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإضافة خيار الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ServiceOptionEntity> updateServiceOption(ServiceOptionEntity option) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/admin/options/${option.id}');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(option.toJson());
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client
          .patch(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return ServiceOptionEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعديل خيار الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعديل خيار الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> deleteServiceOption(String optionId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/admin/options/$optionId');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حذف خيار الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف خيار الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<DynamicServiceConfigEntity> getServiceConfiguration(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/$id/configuration');
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return DynamicServiceConfigEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل إعدادات الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل إعدادات الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<DynamicPriceQuoteEntity> calculateDynamicPrice(
    String id,
    Map<String, dynamic> answers, {
    String? optionId,
    int quantity = 1,
    String? couponCode,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/services/$id/calculate-price');
    final sw = Stopwatch()..start();

    try {
      final payload = {
        'answers': answers,
        'quantity': quantity,
        if (optionId != null) 'optionId': optionId,
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      };

      final headers = await _getHeaders(requireAuth: false);
      final encodedBody = jsonEncode(payload);
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client
          .post(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return DynamicPriceQuoteEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حساب سعر الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحساب السعر ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

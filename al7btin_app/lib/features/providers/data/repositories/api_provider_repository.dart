import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../domain/entities/provider_entity.dart';
import '../../domain/repositories/provider_repository_interface.dart';

class ApiProviderRepository implements IProviderRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiProviderRepository({
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
  Future<List<ProviderEntity>> getProviders({String? serviceCategoryId, String? serviceId, bool includeInactive = false}) async {
    final endpoint = includeInactive ? '/providers/admin/all' : '/providers';
    final queryParams = <String, String>{};
    if (serviceId != null && serviceId.isNotEmpty) {
      queryParams['serviceId'] = serviceId;
    }
    if (serviceCategoryId != null && serviceCategoryId.isNotEmpty) {
      queryParams['categoryId'] = serviceCategoryId;
    }
    if (includeInactive) {
      queryParams['includeUnavailable'] = 'true';
    }

    final queryString = queryParams.isNotEmpty ? '?${Uri(queryParameters: queryParams).query}' : '';
    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint$queryString');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: includeInactive);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>;
        var providers = list.map((item) => ProviderEntity.fromJson(item as Map<String, dynamic>)).toList();

        if (serviceCategoryId != null && serviceCategoryId.isNotEmpty) {
          providers = providers.where((p) => p.serviceCategories.contains(serviceCategoryId)).toList();
        }

        if (serviceId != null && serviceId.isNotEmpty) {
          providers = providers.where((p) => p.availableServiceIds.contains(serviceId)).toList();
        }

        return providers;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل المزودين.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل مراكز التوزيع ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ProviderEntity?> getProviderById(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/$id');
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return ProviderEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ProviderEntity?> getProviderForService(String serviceCategoryId) async {
    final list = await getProviders(serviceCategoryId: serviceCategoryId);
    if (list.isNotEmpty) {
      return list.first;
    }
    return null;
  }

  @override
  Future<List<ProviderEntity>> getProvidersForService(String serviceId) async {
    return getProviders(serviceId: serviceId);
  }

  @override
  Future<ProviderEntity> addProvider(ProviderEntity provider) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/admin');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(provider.toJson());
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client
          .post(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return ProviderEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إضافة المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإضافة المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<ProviderEntity> updateProvider(ProviderEntity provider) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/admin/${provider.id}');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(provider.toJson());
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client
          .patch(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return ProviderEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعديل المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعديل المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> deleteProvider(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/admin/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حذف المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<Map<String, dynamic>?> getMyProviderProfile() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/providers/me');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return body['data'] as Map<String, dynamic>?;
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل بيانات المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل بيانات المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<bool> updateMyProviderStatus(bool isAvailable) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/status');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final bodyMap = jsonEncode({'isAvailable': isAvailable});
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: bodyMap);

      final response = await _client.patch(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return true;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعديل حالة المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعديل حالة المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<bool> updateMyProviderProfile(Map<String, dynamic> data) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/profile');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final bodyMap = jsonEncode(data);
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: bodyMap);

      final response = await _client.patch(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return true;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث بيانات المتجر.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث بيانات المتجر ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getMyProviderOrders() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/orders');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final list = body['data'] as List<dynamic>? ?? [];
        return list.map((e) => e as Map<String, dynamic>).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل طلبات المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل طلبات المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<bool> acceptOrder(String orderId, {String? notes}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/orders/$orderId/accept');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final bodyMap = jsonEncode({'notes': notes ?? 'تم قبول وتجهيز الطلب من قبل المزود'});
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: bodyMap);

      final response = await _client.patch(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return true;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل قبول الطلب.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لقبول الطلب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<bool> rejectOrder(String orderId, {String? notes}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/orders/$orderId/reject');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final bodyMap = jsonEncode({'notes': notes ?? 'تم رفض الطلب من قبل المزود'});
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: bodyMap);

      final response = await _client.patch(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return true;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل رفض الطلب.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لرفض الطلب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<bool> updateOrderStatus(String orderId, String status, {String? notes}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/orders/$orderId/status');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final bodyMap = jsonEncode({
        'status': status,
        if (notes != null) 'notes': notes,
      });
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: bodyMap);

      final response = await _client.patch(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return true;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث حالة الطلب.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث حالة الطلب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getMyProviderServices() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/services');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final list = body['data'] as List<dynamic>? ?? [];
        return list.map((e) => e as Map<String, dynamic>).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل خدمات المزود.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل خدمات المزود ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<bool> updateServiceAvailability(String serviceId, bool isAvailable) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/provider/services/$serviceId/availability');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final bodyMap = jsonEncode({'isAvailable': isAvailable});
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: bodyMap);

      final response = await _client.patch(uri, headers: headers, body: bodyMap).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return true;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعديل توفر الخدمة.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعديل توفر الخدمة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

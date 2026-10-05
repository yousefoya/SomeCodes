import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../domain/entities/delivery_employee_entity.dart';
import '../../domain/repositories/delivery_repository_interface.dart';

class ApiDeliveryRepository implements IDeliveryRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiDeliveryRepository({
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
  Future<List<DeliveryEmployeeEntity>> getDeliveryEmployees() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/delivery-employees');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>;
        return list.map((item) => DeliveryEmployeeEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل كادر التوصيل.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل كادر التوصيل ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<DeliveryEmployeeEntity> addDeliveryEmployee({
    required String name,
    required String phoneNumber,
    required String vehicleType,
    required String vehiclePlateNumber,
    required String providerId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/delivery-employees');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final payload = {
        'name': name.trim(),
        'phoneNumber': phoneNumber.trim(),
        'vehicleType': vehicleType.trim(),
        'vehiclePlateNumber': vehiclePlateNumber.trim(),
        'providerId': providerId.trim(),
        'serviceIds': serviceIds,
        'categoryIds': categoryIds,
      };

      final encodedBody = jsonEncode(payload);
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client
          .post(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return DeliveryEmployeeEntity.fromJson(body['data']['driver'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إضافة مندوب التوصيل.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإضافة مندوب التوصيل ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<DeliveryEmployeeEntity> updateDeliveryEmployee(DeliveryEmployeeEntity employee) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/delivery-employees/${employee.id}');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(employee.toJson());
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client
          .patch(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return DeliveryEmployeeEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تعديل بيانات المندوب.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتعديل بيانات المندوب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> toggleEmployeeStatus(String id, bool currentStatus) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/delivery-employees/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode({'isActive': !currentStatus});
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client
          .patch(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث حالة المندوب.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث حالة المندوب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> updateDeliveryCapabilities({
    required String driverId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/delivery-employees/$driverId/capabilities');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode({
        'serviceIds': serviceIds,
        'categoryIds': categoryIds,
      });
      ApiConfig.logRequest('PUT', uri, headers: headers, body: encodedBody);

      final response = await _client
          .put(
            uri,
            headers: headers,
            body: encodedBody,
          )
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PUT', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث تصاريح المندوب.');
      }
    } catch (e, st) {
      ApiConfig.logError('PUT', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث تصاريح المندوب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> deleteDeliveryEmployee(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/delivery-employees/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حذف حساب المندوب.');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف حساب المندوب ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

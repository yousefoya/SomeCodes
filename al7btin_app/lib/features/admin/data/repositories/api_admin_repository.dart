import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../domain/entities/admin_dashboard_stats.dart';
import '../../domain/entities/admin_paginated_users.dart';
import '../../domain/repositories/admin_repository_interface.dart';

class ApiAdminRepository implements IAdminRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiAdminRepository({
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
  Future<AdminPaginatedUsers> getUsers({
    int page = 1,
    int limit = 20,
    String? search,
    String? role,
    String? status,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (role != null && role.isNotEmpty && role != 'all') {
      queryParams['role'] = role;
    }
    if (status != null && status.isNotEmpty && status != 'all') {
      queryParams['status'] = status;
    }

    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/users').replace(queryParameters: queryParams);
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return AdminPaginatedUsers.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل قائمة المستخدمين.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل المستخدمين ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<UserEntity> getUserById(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/users/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return UserEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل بيانات المستخدم.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل المستخدم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<UserEntity> createUser({
    required String phoneNumber,
    String? name,
    String? email,
    String role = 'customer',
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/users');
    final sw = Stopwatch()..start();

    final payload = {
      'phoneNumber': phoneNumber,
      'name': name,
      'email': email,
      'role': role,
    };

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(payload);
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client.post(uri, headers: headers, body: encodedBody).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return UserEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إنشاء حساب المستخدم.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإنشاء المستخدم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<UserEntity> updateUser({
    required String id,
    String? name,
    String? email,
    String? role,
    bool? isSuspended,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/users/$id');
    final sw = Stopwatch()..start();

    final payload = <String, dynamic>{};
    if (name != null) payload['name'] = name;
    if (email != null) payload['email'] = email;
    if (role != null) payload['role'] = role;
    if (isSuspended != null) payload['isSuspended'] = isSuspended;

    try {
      final headers = await _getHeaders(requireAuth: true);
      final encodedBody = jsonEncode(payload);
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client.patch(uri, headers: headers, body: encodedBody).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return UserEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث بيانات المستخدم.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث المستخدم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> suspendUser(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/users/$id/suspend');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('POST', uri, headers: headers);

      final response = await _client.post(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إيقاف حساب المستخدم.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإيقاف المستخدم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> activateUser(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/users/$id/activate');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('POST', uri, headers: headers);

      final response = await _client.post(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تنشيط حساب المستخدم.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتنشيط المستخدم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<AdminDashboardStats> getDashboardStats() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/admin/stats');
    final sw = Stopwatch()..start();

    try {
      final headers = await _getHeaders(requireAuth: true);
      ApiConfig.logRequest('GET', uri, headers: headers);

      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return AdminDashboardStats.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل إحصائيات المنصة.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل إحصائيات لوحة التحكم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

/// Riverpod Provider for IAdminRepository
final adminRepositoryProvider = Provider<IAdminRepository>((ref) {
  final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiAdminRepository(authLocalDataSource: authLocalDataSource);
});

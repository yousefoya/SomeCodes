import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/category_entity.dart';
import '../../domain/repositories/category_repository_interface.dart';

class ApiCategoryRepository implements ICategoryRepository {
  final http.Client _client;

  ApiCategoryRepository({http.Client? client}) : _client = client ?? http.Client();

  @override
  Future<List<CategoryEntity>> getCategories() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/categories');
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final List<dynamic> list = body['data'] as List<dynamic>;
        return list.map((item) => CategoryEntity.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل الفئات.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحميل الفئات ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<CategoryEntity?> getCategoryById(String id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/categories/$id');
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('GET', uri);
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('GET', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return CategoryEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحميل الفئة.');
      }
    } catch (e, st) {
      ApiConfig.logError('GET', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<CategoryEntity> createCategory(CategoryEntity category, {String? adminToken}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/categories/admin');
    final sw = Stopwatch()..start();

    try {
      final headers = <String, String>{'Content-Type': 'application/json'};
      if (adminToken != null) headers['Authorization'] = 'Bearer $adminToken';

      final encodedBody = jsonEncode(category.toJson());
      ApiConfig.logRequest('POST', uri, headers: headers, body: encodedBody);

      final response = await _client
          .post(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 201 && body['success'] == true) {
        return CategoryEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إنشاء الفئة.');
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لإنشاء الفئة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<CategoryEntity> updateCategory(CategoryEntity category, {String? adminToken}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/categories/admin/${category.id}');
    final sw = Stopwatch()..start();

    try {
      final headers = <String, String>{'Content-Type': 'application/json'};
      if (adminToken != null) headers['Authorization'] = 'Bearer $adminToken';

      final encodedBody = jsonEncode(category.toJson());
      ApiConfig.logRequest('PATCH', uri, headers: headers, body: encodedBody);

      final response = await _client
          .patch(uri, headers: headers, body: encodedBody)
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return CategoryEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل تحديث الفئة.');
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لتحديث الفئة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }

  @override
  Future<void> deleteCategory(String id, {String? adminToken}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/categories/admin/$id');
    final sw = Stopwatch()..start();

    try {
      final headers = <String, String>{};
      if (adminToken != null) headers['Authorization'] = 'Bearer $adminToken';
      ApiConfig.logRequest('DELETE', uri, headers: headers);

      final response = await _client.delete(uri, headers: headers).timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل حذف الفئة.');
      }
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
      if (e is Failure) rethrow;
      throw NetworkFailure('تعذر الاتصال بالخادم لحذف الفئة ($uri): $e', code: 'CONNECTION_FAILED');
    }
  }
}

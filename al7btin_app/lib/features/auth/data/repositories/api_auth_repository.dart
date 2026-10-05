import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository_interface.dart';
import '../datasources/auth_local_datasource.dart';

class ApiAuthRepository implements IAuthRepository {
  final http.Client _client;
  final IAuthLocalDataSource _localDataSource;

  ApiAuthRepository({
    http.Client? client,
    required IAuthLocalDataSource localDataSource,
  })  : _client = client ?? http.Client(),
        _localDataSource = localDataSource;

  @override
  Future<OtpSendResult> sendOtp(String phoneNumber, {String? name, bool isRegister = false}) async {
    final endpoint = isRegister ? 'auth/register' : 'auth/login';
    final uri = Uri.parse('${ApiConfig.baseUrl}/$endpoint');
    final sw = Stopwatch()..start();

    try {
      final payload = <String, dynamic>{'phoneNumber': phoneNumber};
      if (isRegister && name != null && name.trim().isNotEmpty) {
        payload['name'] = name.trim();
      }

      final encodedBody = jsonEncode(payload);
      ApiConfig.logRequest('POST', uri, body: encodedBody);

      final response = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: encodedBody,
          )
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>?;
        final devOtp = data?['devOtp']?.toString();
        final message = data?['message']?.toString() ?? 'تم إرسال كود التحقق بنجاح.';
        return OtpSendResult(
          success: true,
          message: message,
          devOtp: devOtp,
        );
      } else {
        final errorMsg = body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل إرسال كود التحقق.';
        throw AuthFailure(errorMsg);
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is AuthFailure) rethrow;
      throw const AuthFailure('تعذر الاتصال بالخادم. يرجى التأكد من تشغيل السيرفر أو فحص إعدادات عنوان الخادم.');
    }
  }

  @override
  Future<UserEntity> verifyOtp({
    required String phoneNumber,
    required String otp,
    String? name,
    bool isRegister = false,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/auth/verify-otp');
    final sw = Stopwatch()..start();

    try {
      final payload = <String, dynamic>{
        'phoneNumber': phoneNumber,
        'otp': otp,
        'mode': isRegister ? 'register' : 'login',
      };
      if (isRegister && name != null && name.trim().isNotEmpty) {
        payload['name'] = name.trim();
      }

      final encodedBody = jsonEncode(payload);
      ApiConfig.logRequest('POST', uri, body: encodedBody);

      final response = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: encodedBody,
          )
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>;
        final userJson = data['user'] as Map<String, dynamic>;
        final accessToken = data['accessToken'].toString();
        final refreshToken = data['refreshToken'].toString();

        final user = UserEntity.fromJson(userJson);

        // Save session locally
        await _localDataSource.saveSession(
          user: user,
          accessToken: accessToken,
          refreshToken: refreshToken,
        );

        return user;
      } else {
        final errorMsg = body['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}: فشل التحقق من كود التحقق.';
        throw AuthFailure(errorMsg);
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is AuthFailure) rethrow;
      throw const AuthFailure('تعذر إتمام عملية التحقق. يرجى التأكد من تشغيل السيرفر أو فحص الاتصال بالإنترنت.');
    }
  }

  @override
  Future<UserEntity?> getCurrentUser() async {
    final cachedUser = await _localDataSource.getUser();
    final accessToken = await _localDataSource.getAccessToken();

    if (cachedUser == null || accessToken == null) {
      return null;
    }

    // Verify token with backend
    final uri = Uri.parse('${ApiConfig.baseUrl}/auth/me');
    try {
      final response = await _client.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;
        if (body['success'] == true && body['data'] != null) {
          final updatedUser = UserEntity.fromJson(body['data'] as Map<String, dynamic>);
          final refreshToken = await _localDataSource.getRefreshToken() ?? '';
          await _localDataSource.saveSession(
            user: updatedUser,
            accessToken: accessToken,
            refreshToken: refreshToken,
          );
          return updatedUser;
        }
      } else if (response.statusCode == 401) {
        // Try refresh token
        final refreshedUser = await _tryRefreshToken();
        if (refreshedUser != null) return refreshedUser;
      } else if (response.statusCode == 403) {
        // User suspended or forbidden
        await _localDataSource.clearSession();
        return null;
      }
    } catch (_) {
      // Return cached user if offline
    }

    return cachedUser;
  }

  Future<UserEntity?> _tryRefreshToken() async {
    final refreshToken = await _localDataSource.getRefreshToken();
    if (refreshToken == null) return null;

    final uri = Uri.parse('${ApiConfig.baseUrl}/auth/refresh');
    try {
      final response = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;
        if (body['success'] == true) {
          final data = body['data'] as Map<String, dynamic>;
          final newAccessToken = data['accessToken'].toString();
          final newRefreshToken = data['refreshToken'].toString();
          await _localDataSource.updateAccessToken(newAccessToken);

          // Get updated user profile
          final meUri = Uri.parse('${ApiConfig.baseUrl}/auth/me');
          final meRes = await _client.get(
            meUri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $newAccessToken',
            },
          );

          if (meRes.statusCode == 200) {
            final Map<String, dynamic> meBody = jsonDecode(meRes.body) as Map<String, dynamic>;
            final user = UserEntity.fromJson(meBody['data'] as Map<String, dynamic>);
            await _localDataSource.saveSession(
              user: user,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            );
            return user;
          }
        }
      }
    } catch (_) {}

    await _localDataSource.clearSession();
    return null;
  }

  @override
  Future<OtpSendResult> sendChangePhoneOtp(String newPhoneNumber) async {
    final accessToken = await _localDataSource.getAccessToken();
    if (accessToken == null) {
      throw const AuthFailure('يرجى تسجيل الدخول أولاً.');
    }

    final uri = Uri.parse('${ApiConfig.baseUrl}/auth/phone/send-otp');
    final sw = Stopwatch()..start();

    try {
      final payload = jsonEncode({'newPhoneNumber': newPhoneNumber});
      ApiConfig.logRequest('POST', uri, body: payload);

      final response = await _client
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: payload,
          )
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('POST', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>?;
        final devOtp = data?['devOtp']?.toString();
        final message = data?['message']?.toString() ?? 'تم إرسال رمز التحقق إلى الرقم الجديد بنجاح.';
        return OtpSendResult(
          success: true,
          message: message,
          devOtp: devOtp,
        );
      } else {
        final errorMsg = body['error']?['message']?.toString() ?? 'فشل إرسال كود التحقق للرقم الجديد.';
        throw AuthFailure(errorMsg);
      }
    } catch (e, st) {
      ApiConfig.logError('POST', uri, e, stackTrace: st);
      if (e is AuthFailure) rethrow;
      throw AuthFailure('تعذر الاتصال بالخادم ($uri): $e');
    }
  }

  @override
  Future<UserEntity> changePhoneNumber({
    required String newPhoneNumber,
    required String otp,
  }) async {
    final accessToken = await _localDataSource.getAccessToken();
    final refreshToken = await _localDataSource.getRefreshToken() ?? '';
    if (accessToken == null) {
      throw const AuthFailure('يرجى تسجيل الدخول أولاً.');
    }

    final uri = Uri.parse('${ApiConfig.baseUrl}/auth/phone');
    final sw = Stopwatch()..start();

    try {
      final payload = jsonEncode({
        'newPhoneNumber': newPhoneNumber,
        'otp': otp,
      });
      ApiConfig.logRequest('PATCH', uri, body: payload);

      final response = await _client
          .patch(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: payload,
          )
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('PATCH', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>;
        final user = UserEntity.fromJson(data);
        await _localDataSource.saveSession(
          user: user,
          accessToken: accessToken,
          refreshToken: refreshToken,
        );
        return user;
      } else {
        final errorMsg = body['error']?['message']?.toString() ?? 'فشل تحديث رقم الهاتف.';
        throw AuthFailure(errorMsg);
      }
    } catch (e, st) {
      ApiConfig.logError('PATCH', uri, e, stackTrace: st);
      if (e is AuthFailure) rethrow;
      throw AuthFailure('تعذر إتمام عملية تحديث رقم الهاتف ($uri): $e');
    }
  }

  @override
  Future<void> deleteAccount() async {
    final accessToken = await _localDataSource.getAccessToken();
    if (accessToken == null) {
      await _localDataSource.clearSession();
      return;
    }

    final uri = Uri.parse('${ApiConfig.baseUrl}/auth/account');
    final sw = Stopwatch()..start();

    try {
      ApiConfig.logRequest('DELETE', uri);
      final response = await _client
          .delete(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(ApiConfig.timeout);
      sw.stop();
      ApiConfig.logResponse('DELETE', uri, response.statusCode, latencyMs: sw.elapsedMilliseconds, body: response.body);
    } catch (e, st) {
      ApiConfig.logError('DELETE', uri, e, stackTrace: st);
    } finally {
      await _localDataSource.clearSession();
    }
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _localDataSource.getRefreshToken();
    final accessToken = await _localDataSource.getAccessToken();

    if (refreshToken != null && accessToken != null) {
      final uri = Uri.parse('${ApiConfig.baseUrl}/auth/logout');
      try {
        await _client.post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $accessToken',
          },
          body: jsonEncode({'refreshToken': refreshToken}),
        ).timeout(const Duration(seconds: 3));
      } catch (_) {}
    }

    await _localDataSource.clearSession();
  }
}

import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:al7btin_app/core/errors/failures.dart';
import 'package:al7btin_app/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:al7btin_app/features/auth/data/repositories/api_auth_repository.dart';
import 'package:al7btin_app/features/auth/domain/entities/user_entity.dart';

void main() {
  group('ApiAuthRepository Tests', () {
    late InMemoryAuthLocalDataSource localDataSource;

    setUp(() {
      localDataSource = InMemoryAuthLocalDataSource();
    });

    test('sendOtp returns true when backend responds with 200 success for login', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login') || request.url.path.endsWith('/auth/send-otp')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'message': 'تم إرسال كود التحقق بنجاح.',
                'expiresInSeconds': 300,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiAuthRepository(
        client: mockClient,
        localDataSource: localDataSource,
      );

      final result = await repo.sendOtp('0791234567', isRegister: false);
      expect(result.success, isTrue);
    });

    test('sendOtp returns true when backend responds with 200 success for register', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/register')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'message': 'تم إرسال كود التحقق بنجاح.',
                'expiresInSeconds': 300,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiAuthRepository(
        client: mockClient,
        localDataSource: localDataSource,
      );

      final result = await repo.sendOtp('0791234567', name: 'أحمد', isRegister: true);
      expect(result.success, isTrue);
    });

    test('verifyOtp parses user, saves session, and returns UserEntity', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/verify-otp')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'user': {
                  'id': 'usr_test_123',
                  'phoneNumber': '0791234567',
                  'name': 'أحمد خالد',
                  'role': 'customer',
                  'walletBalance': 10.5,
                  'points': 50,
                  'isSuspended': false,
                  'createdAt': DateTime.now().toIso8601String(),
                },
                'accessToken': 'jwt_access_token_sample',
                'refreshToken': 'refresh_token_sample',
                'expiresIn': '15m',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiAuthRepository(
        client: mockClient,
        localDataSource: localDataSource,
      );

      final user = await repo.verifyOtp(
        phoneNumber: '0791234567',
        otp: '8492',
      );

      expect(user.id, equals('usr_test_123'));
      expect(user.phoneNumber, equals('0791234567'));
      expect(user.role, equals(UserRole.customer));
      expect(user.walletBalance, equals(10.5));

      // Verify session was stored locally
      final cachedToken = await localDataSource.getAccessToken();
      expect(cachedToken, equals('jwt_access_token_sample'));
    });

    test('verifyOtp throws AuthFailure on invalid OTP response', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'success': false,
            'error': {
              'code': 'INVALID_OTP',
              'message': 'كود التحقق غير صحيح.',
            },
          }),
          400,
          headers: {'content-type': 'application/json'},
        );
      });

      final repo = ApiAuthRepository(
        client: mockClient,
        localDataSource: localDataSource,
      );

      expect(
        () => repo.verifyOtp(phoneNumber: '0791234567', otp: '0000'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('logout revokes tokens and clears local storage', () async {
      await localDataSource.saveSession(
        user: UserEntity(
          id: '1',
          phoneNumber: '0791111111',
          createdAt: DateTime.now(),
        ),
        accessToken: 'token',
        refreshToken: 'refresh',
      );

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'success': true, 'data': {'message': 'Logged out'}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final repo = ApiAuthRepository(
        client: mockClient,
        localDataSource: localDataSource,
      );

      await repo.logout();

      expect(await localDataSource.getAccessToken(), isNull);
      expect(await localDataSource.getUser(), isNull);
    });
  });
}

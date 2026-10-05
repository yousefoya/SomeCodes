import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/core/errors/failures.dart';
import 'package:al7btin_app/features/auth/data/repositories/mock_auth_repository.dart';
import 'package:al7btin_app/features/auth/domain/entities/user_entity.dart';

void main() {
  group('MockAuthRepository Tests', () {
    late MockAuthRepository authRepo;

    setUp(() {
      authRepo = MockAuthRepository(networkDelay: Duration.zero);
    });

    test('sendOtp returns true for standard Jordanian phone number (079XXXXXXX)', () async {
      final result = await authRepo.sendOtp('0791234567');
      expect(result.success, isTrue);
    });

    test('sendOtp normalizes +962 and 00962 country codes correctly', () async {
      expect((await authRepo.sendOtp('+962791234567')).success, isTrue);
      expect((await authRepo.sendOtp('00962781234567')).success, isTrue);
      expect((await authRepo.sendOtp('771234567')).success, isTrue);
    });

    test('sendOtp throws AuthFailure for short or invalid phone number', () async {
      expect(
        () => authRepo.sendOtp('123'),
        throwsA(isA<AuthFailure>()),
      );
      expect(
        () => authRepo.sendOtp('061234567'), // Landline not mobile
        throwsA(isA<AuthFailure>()),
      );
    });

    test('verifyOtp returns authenticated UserEntity on valid 4-digit OTP', () async {
      final user = await authRepo.verifyOtp(
        phoneNumber: '0791234567',
        otp: '1234',
      );

      expect(user, isA<UserEntity>());
      expect(user.phoneNumber, equals('0791234567'));
      expect(user.role, equals(UserRole.customer));
      expect(user.walletBalance, greaterThanOrEqualTo(0.0));
      expect(user.referralCode?.startsWith('BTN-'), isTrue);
    });

    test('verifyOtp throws AuthFailure on invalid OTP', () async {
      expect(
        () => authRepo.verifyOtp(
          phoneNumber: '0791234567',
          otp: 'ab',
        ),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('getCurrentUser returns logged in user after verifyOtp', () async {
      expect(await authRepo.getCurrentUser(), isNull);

      await authRepo.verifyOtp(
        phoneNumber: '0791234567',
        otp: '1234',
      );

      final user = await authRepo.getCurrentUser();
      expect(user, isNotNull);
      expect(user?.phoneNumber, equals('0791234567'));
    });

    test('logout clears user session', () async {
      await authRepo.verifyOtp(
        phoneNumber: '0791234567',
        otp: '1234',
      );
      expect(await authRepo.getCurrentUser(), isNotNull);

      await authRepo.logout();
      expect(await authRepo.getCurrentUser(), isNull);
    });
  });
}

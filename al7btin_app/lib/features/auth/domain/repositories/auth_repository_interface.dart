import '../entities/user_entity.dart';

class OtpSendResult {
  final bool success;
  final String message;
  final String? devOtp;

  const OtpSendResult({
    required this.success,
    this.message = '',
    this.devOtp,
  });
}

/// Abstract contract for authentication operations
abstract class IAuthRepository {
  /// Send an OTP code to the given phone number (supports login vs register)
  Future<OtpSendResult> sendOtp(String phoneNumber, {String? name, bool isRegister = false});

  /// Verify the OTP code and return the authenticated User
  Future<UserEntity> verifyOtp({
    required String phoneNumber,
    required String otp,
    String? name,
    bool isRegister = false,
  });

  /// Retrieve the current cached/persisted user session if available
  Future<UserEntity?> getCurrentUser();

  /// Send an OTP code to a new phone number for phone number update
  Future<OtpSendResult> sendChangePhoneOtp(String newPhoneNumber);

  /// Verify the OTP and update the phone number for authenticated user
  Future<UserEntity> changePhoneNumber({
    required String newPhoneNumber,
    required String otp,
  });

  /// Soft-delete authenticated user account and revoke session
  Future<void> deleteAccount();

  /// Log out current user and clear local session
  Future<void> logout();
}

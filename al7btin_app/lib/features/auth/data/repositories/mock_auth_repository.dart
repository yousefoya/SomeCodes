import 'dart:async';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository_interface.dart';

/// Production-ready mock implementation of IAuthRepository with Jordanian phone normalization and multi-role support
class MockAuthRepository implements IAuthRepository {
  UserEntity? _currentUser;
  final Duration networkDelay;

  MockAuthRepository({
    this.networkDelay = const Duration(milliseconds: 300),
  });

  /// Pre-defined system accounts for testing roles
  static const String adminPhoneNumber = '0790000001';
  static const String deliveryPhoneNumber = '0790000002';
  static const String customerPhoneNumber = '0791234567';

  /// Normalizes any Jordanian phone number variant into standard format
  static String normalizePhoneNumber(String rawPhone) {
    var cleaned = rawPhone.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
    if (cleaned.startsWith('00962')) {
      cleaned = cleaned.substring(5);
    } else if (cleaned.startsWith('962')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return '0$cleaned';
  }

  @override
  Future<OtpSendResult> sendOtp(String phoneNumber, {String? name, bool isRegister = false}) async {
    await Future<void>.delayed(networkDelay);

    final normalized = normalizePhoneNumber(phoneNumber);
    // Standard Jordanian mobile numbers start with 077, 078, or 079 and are 10 digits
    if (normalized.length != 10 || !normalized.startsWith('07')) {
      throw const AuthFailure('يرجى إدخال رقم هاتف أردني صحيح يبدأ بـ 079 أو 078 أو 077');
    }

    return const OtpSendResult(
      success: true,
      message: 'تم إرسال كود التحقق بنجاح.',
      devOtp: '1234',
    );
  }

  @override
  Future<UserEntity> verifyOtp({
    required String phoneNumber,
    required String otp,
    String? name,
    bool isRegister = false,
  }) async {
    await Future<void>.delayed(networkDelay);

    final cleanOtp = otp.trim();
    // Accept valid 4 or 6 digit OTP (Mock accepts test OTP 1234, 0000, or any 4 numeric digits)
    if (cleanOtp.isEmpty || cleanOtp.length < 4 || !RegExp(r'^\d+$').hasMatch(cleanOtp)) {
      throw const AuthFailure('رمز التحقق غير صحيح. يرجى إدخال رمز صالح من 4 أرقام.');
    }

    final normalized = normalizePhoneNumber(phoneNumber);

    // Determine role based on phone or account mapping
    UserRole role = UserRole.customer;
    String userName = name?.trim().isNotEmpty == true ? name!.trim() : 'عميل بتنحل';
    const double walletBalance = 0.0;

    if (normalized == adminPhoneNumber || normalized == '0799999999') {
      role = UserRole.admin;
      userName = 'مدير النظام (Admin)';
    } else if (normalized == deliveryPhoneNumber || normalized == '0798881122' || normalized == '0785553344') {
      role = UserRole.delivery;
      userName = 'مندوب بتنحل (Ahmad)';
    }

    final user = UserEntity(
      id: 'USR-${normalized.hashCode.abs().toString().padLeft(6, '0')}',
      phoneNumber: normalized,
      name: userName,
      role: role,
      walletBalance: walletBalance,
      points: role == UserRole.customer ? 350 : 0,
      referralCode: 'BTN-${normalized.substring(normalized.length - 4)}',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    );

    _currentUser = user;
    return user;
  }

  @override
  Future<UserEntity?> getCurrentUser() async {
    await Future<void>.delayed(const Duration(milliseconds: 50));
    return _currentUser;
  }

  @override
  Future<OtpSendResult> sendChangePhoneOtp(String newPhoneNumber) async {
    await Future<void>.delayed(networkDelay);
    final normalized = normalizePhoneNumber(newPhoneNumber);
    if (normalized.length != 10 || !normalized.startsWith('07')) {
      throw const AuthFailure('يرجى إدخال رقم هاتف أردني صحيح يبدأ بـ 079 أو 078 أو 077');
    }
    return const OtpSendResult(
      success: true,
      message: 'تم إرسال رمز التحقق إلى الرقم الجديد بنجاح.',
      devOtp: '1234',
    );
  }

  @override
  Future<UserEntity> changePhoneNumber({
    required String newPhoneNumber,
    required String otp,
  }) async {
    await Future<void>.delayed(networkDelay);
    final cleanOtp = otp.trim();
    if (cleanOtp.isEmpty || cleanOtp.length < 4) {
      throw const AuthFailure('رمز التحقق غير صحيح.');
    }
    final normalized = normalizePhoneNumber(newPhoneNumber);
    if (_currentUser == null) {
      throw const AuthFailure('لم يتم العثور على جلسة مسجلة.');
    }
    final updated = _currentUser!.copyWith(phoneNumber: normalized);
    _currentUser = updated;
    return updated;
  }

  @override
  Future<void> deleteAccount() async {
    await Future<void>.delayed(const Duration(milliseconds: 50));
    _currentUser = null;
  }

  @override
  Future<void> logout() async {
    await Future<void>.delayed(const Duration(milliseconds: 50));
    _currentUser = null;
  }
}

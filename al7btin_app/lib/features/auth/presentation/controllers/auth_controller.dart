import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/errors/failures.dart';
import '../../data/datasources/auth_local_datasource.dart';
import '../../data/repositories/api_auth_repository.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository_interface.dart';
import 'auth_state.dart';

/// Provider for local auth storage data source (overridden with SharedPreferences in production)
final authLocalDataSourceProvider = Provider<IAuthLocalDataSource>((ref) {
  return InMemoryAuthLocalDataSource();
});

/// Provider for IAuthRepository interface (connected to real REST API)
final authRepositoryProvider = Provider<IAuthRepository>((ref) {
  final localDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiAuthRepository(localDataSource: localDataSource);
});

/// Auth Controller managing login, OTP verification, session loading, multi-role switching, and logout
class AuthController extends StateNotifier<AuthState> {
  final IAuthRepository _authRepository;

  AuthController(this._authRepository) : super(AuthState.initial()) {
    checkCurrentSession();
  }

  /// Check if user has an existing cached session
  Future<void> checkCurrentSession() async {
    try {
      final user = await _authRepository.getCurrentUser();
      if (!mounted) return;
      if (user != null) {
        state = AuthState.authenticated(user);
      } else {
        state = AuthState.unauthenticated();
      }
    } catch (e) {
      if (!mounted) return;
      state = AuthState.unauthenticated();
    }
  }

  /// Request OTP for a phone number
  Future<bool> sendOtp(String phoneNumber, {String? name, bool isRegister = false}) async {
    state = AuthState.loading(phoneNumber: phoneNumber, customerName: name, isRegister: isRegister);
    try {
      final result = await _authRepository.sendOtp(phoneNumber, name: name, isRegister: isRegister);
      if (!mounted) return true;
      state = AuthState.otpSent(phoneNumber, customerName: name, devOtp: result.devOtp, isRegister: isRegister);
      return true;
    } on Failure catch (failure) {
      if (!mounted) return false;
      state = AuthState.error(failure.message, phoneNumber: phoneNumber, customerName: name, isRegister: isRegister);
      return false;
    } catch (e) {
      if (!mounted) return false;
      state = AuthState.error('حدث خطأ أثناء إرسال رمز التحقق. يرجى التحقق من الاتصال بالخادم.', phoneNumber: phoneNumber, customerName: name, isRegister: isRegister);
      return false;
    }
  }

  /// Verify entered OTP
  Future<bool> verifyOtp(String otp) async {
    final currentPhone = state.phoneNumber;
    if (currentPhone == null) {
      state = AuthState.error('رقم الهاتف غير متوفر، يرجى إعادة إدخال رقم الهاتف.');
      return false;
    }

    final name = state.customerName;
    final isRegister = state.isRegister;
    state = AuthState.loading(phoneNumber: currentPhone, customerName: name, isRegister: isRegister);
    try {
      final user = await _authRepository.verifyOtp(
        phoneNumber: currentPhone,
        otp: otp,
        name: name,
        isRegister: isRegister,
      );
      if (!mounted) return true;
      state = AuthState.authenticated(user);
      return true;
    } on Failure catch (failure) {
      if (!mounted) return false;
      state = AuthState.error(failure.message, phoneNumber: currentPhone, customerName: name, isRegister: isRegister);
      return false;
    } catch (e) {
      if (!mounted) return false;
      state = AuthState.error('فشل التحقق من الرمز. يرجى المحاولة مرة أخرى.', phoneNumber: currentPhone, customerName: name, isRegister: isRegister);
      return false;
    }
  }

  /// Send OTP to new phone number for phone change
  Future<OtpSendResult> sendChangePhoneOtp(String newPhoneNumber) async {
    try {
      return await _authRepository.sendChangePhoneOtp(newPhoneNumber);
    } catch (e) {
      if (e is Failure) rethrow;
      throw AuthFailure('حدث خطأ أثناء إرسال رمز التحقق: $e');
    }
  }

  /// Verify OTP and update phone number
  Future<UserEntity> changePhoneNumber(String newPhoneNumber, String otp) async {
    try {
      final updatedUser = await _authRepository.changePhoneNumber(
        newPhoneNumber: newPhoneNumber,
        otp: otp,
      );
      if (mounted) {
        state = AuthState.authenticated(updatedUser);
      }
      return updatedUser;
    } catch (e) {
      if (e is Failure) rethrow;
      throw AuthFailure('فشل تحديث رقم الهاتف: $e');
    }
  }

  /// Delete/Deactivate user account
  Future<void> deleteAccount() async {
    state = AuthState.loading();
    try {
      await _authRepository.deleteAccount();
      if (!mounted) return;
      state = AuthState.unauthenticated();
    } catch (e) {
      if (!mounted) return;
      state = AuthState.unauthenticated();
    }
  }

  /// Log out user
  Future<void> logout() async {
    state = AuthState.loading();
    try {
      await _authRepository.logout();
      if (!mounted) return;
      state = AuthState.unauthenticated();
    } catch (e) {
      if (!mounted) return;
      state = AuthState.unauthenticated();
    }
  }
}

/// Provider for AuthController state
final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthController(repository);
});

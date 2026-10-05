import '../../domain/entities/user_entity.dart';

enum AuthStatus {
  initial,
  loading,
  otpSent,
  authenticated,
  unauthenticated,
  error,
}

/// Immutable state representing the authentication lifecycle
class AuthState {
  final AuthStatus status;
  final UserEntity? user;
  final String? phoneNumber;
  final String? customerName;
  final String? devOtp;
  final String? errorMessage;
  final bool isRegister;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.phoneNumber,
    this.customerName,
    this.devOtp,
    this.errorMessage,
    this.isRegister = false,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isLoading => status == AuthStatus.loading;
  bool get isOtpSent => status == AuthStatus.otpSent;
  bool get hasError => status == AuthStatus.error && errorMessage != null;

  AuthState copyWith({
    AuthStatus? status,
    UserEntity? user,
    String? phoneNumber,
    String? customerName,
    String? devOtp,
    String? errorMessage,
    bool? isRegister,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      customerName: customerName ?? this.customerName,
      devOtp: devOtp ?? this.devOtp,
      errorMessage: errorMessage,
      isRegister: isRegister ?? this.isRegister,
    );
  }

  factory AuthState.initial() => const AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.loading({String? phoneNumber, String? customerName, bool isRegister = false}) => AuthState(
        status: AuthStatus.loading,
        phoneNumber: phoneNumber,
        customerName: customerName,
        isRegister: isRegister,
      );
  factory AuthState.otpSent(String phoneNumber, {String? customerName, String? devOtp, bool isRegister = false}) => AuthState(
        status: AuthStatus.otpSent,
        phoneNumber: phoneNumber,
        customerName: customerName,
        devOtp: devOtp,
        isRegister: isRegister,
      );
  factory AuthState.authenticated(UserEntity user) => AuthState(
        status: AuthStatus.authenticated,
        user: user,
      );
  factory AuthState.unauthenticated() => const AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.error(String message, {String? phoneNumber, String? customerName, bool isRegister = false}) => AuthState(
        status: AuthStatus.error,
        errorMessage: message,
        phoneNumber: phoneNumber,
        customerName: customerName,
        isRegister: isRegister,
      );
}

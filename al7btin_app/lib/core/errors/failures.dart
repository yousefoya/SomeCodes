/// Base failure class for the domain layer
abstract class Failure {
  final String message;
  final String? code;

  const Failure(this.message, {this.code});

  @override
  String toString() => '$runtimeType(message: $message, code: $code)';
}

/// Server/API failure
class ServerFailure extends Failure {
  final int? statusCode;
  const ServerFailure(super.message, {super.code, this.statusCode});
}

/// Local cache / storage failure
class CacheFailure extends Failure {
  const CacheFailure(super.message, {super.code});
}

/// Network connectivity failure
class NetworkFailure extends Failure {
  const NetworkFailure(super.message, {super.code});
}

/// Authentication/Authorization failure
class AuthFailure extends Failure {
  const AuthFailure(super.message, {super.code});
}

/// Payment processing failure
class PaymentFailure extends Failure {
  const PaymentFailure(super.message, {super.code});
}

/// Location service failure
class LocationFailure extends Failure {
  const LocationFailure(super.message, {super.code});
}

/// Validation failure
class ValidationFailure extends Failure {
  const ValidationFailure(super.message, {super.code});
}


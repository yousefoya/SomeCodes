/// Supported payment methods in بتنحل (AL7BTIN)
enum PaymentMethodType {
  cashOnDelivery,
  card,
  applePay,
  walletBalance,
}

/// Payment transaction lifecycle states
enum PaymentStatus {
  pending,
  successful,
  failed,
  refunded,
}

/// Generic payment result object
class PaymentResult {
  final bool isSuccess;
  final PaymentStatus status;
  final String? transactionId;
  final String? errorMessage;
  final Map<String, dynamic>? metadata;

  const PaymentResult({
    required this.isSuccess,
    required this.status,
    this.transactionId,
    this.errorMessage,
    this.metadata,
  });

  factory PaymentResult.success({
    required String transactionId,
    Map<String, dynamic>? metadata,
  }) {
    return PaymentResult(
      isSuccess: true,
      status: PaymentStatus.successful,
      transactionId: transactionId,
      metadata: metadata,
    );
  }

  factory PaymentResult.failure({
    required String errorMessage,
    PaymentStatus status = PaymentStatus.failed,
  }) {
    return PaymentResult(
      isSuccess: false,
      status: status,
      errorMessage: errorMessage,
    );
  }
}

/// Abstract contract for payment processing
/// Decouples Flutter UI from specific payment gateways (HyperPay, PayTabs, Stripe, etc.)
abstract class IPaymentService {
  Future<PaymentResult> initializePaymentSession({
    required double amount,
    required String currency,
    required String orderId,
    required PaymentMethodType method,
  });

  Future<PaymentResult> verifyTransaction({
    required String transactionId,
  });

  Future<PaymentResult> processApplePay({
    required double amount,
    required String currency,
    required String orderId,
  });
}

import '../../domain/entities/cart_item_entity.dart';

/// Immutable Cart State calculating accurate dynamic totals with strictly 0.00 JOD delivery fee
class CartState {
  final List<CartItemEntity> items;
  final String? appliedCoupon;
  final double discountAmount;
  final String selectedPaymentMethod;
  final String? orderNotes;

  const CartState({
    this.items = const [],
    this.appliedCoupon,
    this.discountAmount = 0.0,
    this.selectedPaymentMethod = 'cashOnDelivery',
    this.orderNotes,
  });

  /// Applied coupon code alias
  String? get couponCode => appliedCoupon;

  /// Subtotal: exact sum of each item's total (unitPrice × quantity)
  double get subtotal => items.fold(0.0, (sum, item) => sum + item.itemTotal);

  /// Delivery fee: strictly 0.00 JOD platform-wide (Free delivery)
  double get deliveryFee => 0.0;

  /// Final total amount payable by customer: subtotal - discountAmount
  double get totalAmount {
    final rawTotal = subtotal + deliveryFee - discountAmount;
    return rawTotal > 0 ? rawTotal : 0.0;
  }

  /// Total count of items in the cart
  int get totalItemsCount => items.fold(0, (count, item) => count + item.quantity);

  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  CartState copyWith({
    List<CartItemEntity>? items,
    String? appliedCoupon,
    double? discountAmount,
    String? selectedPaymentMethod,
    String? orderNotes,
    bool clearCoupon = false,
  }) {
    return CartState(
      items: items ?? this.items,
      appliedCoupon: clearCoupon ? null : (appliedCoupon ?? this.appliedCoupon),
      discountAmount: clearCoupon ? 0.0 : (discountAmount ?? this.discountAmount),
      selectedPaymentMethod: selectedPaymentMethod ?? this.selectedPaymentMethod,
      orderNotes: orderNotes ?? this.orderNotes,
    );
  }
}

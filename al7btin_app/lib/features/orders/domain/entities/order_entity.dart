import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/checkout/domain/entities/cart_item_entity.dart';

/// Comprehensive lifecycle statuses for an order
enum OrderStatus {
  pending,
  confirmed,
  offeredToDriver,
  awaitingAssignment,
  assigned,
  accepted,
  goingToPickup,
  pickedUp,
  goingToCustomer,
  completed,
  failed,
  cancelled,
  rejected;

  String getLabelAr() {
    switch (this) {
      case OrderStatus.pending:
        return 'قيد الانتظار';
      case OrderStatus.confirmed:
        return 'تم تأكيد الطلب';
      case OrderStatus.offeredToDriver:
      case OrderStatus.awaitingAssignment:
      case OrderStatus.assigned:
        return 'بانتظار تجهيز المزود';
      case OrderStatus.accepted:
        return 'تم القبول والتجهيز من المزود';
      case OrderStatus.goingToPickup:
      case OrderStatus.pickedUp:
      case OrderStatus.goingToCustomer:
        return 'في طريق التوصيل للعميل';
      case OrderStatus.completed:
        return 'تم التوصيل بنجاح';
      case OrderStatus.failed:
        return 'تعذر التوصيل';
      case OrderStatus.cancelled:
        return 'ملغي';
      case OrderStatus.rejected:
        return 'مرفوض من المزود';
    }
  }

  String getLabelEn() {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.offeredToDriver:
      case OrderStatus.awaitingAssignment:
      case OrderStatus.assigned:
        return 'Assigned to Provider';
      case OrderStatus.accepted:
        return 'Accepted by Provider';
      case OrderStatus.goingToPickup:
      case OrderStatus.pickedUp:
      case OrderStatus.goingToCustomer:
        return 'Out for Delivery';
      case OrderStatus.completed:
        return 'Delivered';
      case OrderStatus.failed:
        return 'Failed';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.rejected:
        return 'Rejected by Provider';
    }
  }
}

/// Order assignment lifecycle status for automatic dispatch
enum OrderAssignmentStatus {
  unassigned,
  offered,
  assigned,
  rejected,
}

/// Order item snapshot storing exact unit price, quantity, and variant details at time of purchase
class OrderItemEntity {
  final String serviceId;
  final String? serviceOptionId;
  final String? variantNameAr;
  final String? variantNameEn;
  final String serviceNameAr;
  final String serviceNameEn;
  final double unitPrice;
  final int quantity;
  final double totalPrice;
  final String unitAr;
  final String unitEn;

  const OrderItemEntity({
    required this.serviceId,
    this.serviceOptionId,
    this.variantNameAr,
    this.variantNameEn,
    required this.serviceNameAr,
    required this.serviceNameEn,
    required this.unitPrice,
    required this.quantity,
    required this.totalPrice,
    required this.unitAr,
    required this.unitEn,
  });

  factory OrderItemEntity.fromCartItem(CartItemEntity cartItem) {
    return OrderItemEntity(
      serviceId: cartItem.serviceId,
      serviceOptionId: cartItem.selectedOptionId,
      variantNameAr: cartItem.selectedOptionNameAr,
      variantNameEn: cartItem.selectedOptionNameEn,
      serviceNameAr: cartItem.serviceNameAr,
      serviceNameEn: cartItem.serviceNameEn,
      unitPrice: cartItem.unitPrice,
      quantity: cartItem.quantity,
      totalPrice: cartItem.itemTotal,
      unitAr: cartItem.unitAr,
      unitEn: cartItem.unitEn,
    );
  }
}

/// Production Order Entity with persistent provider association, delivery fee = 0, and automatic dispatch state
class OrderEntity {
  final String id;
  final String? customerId;
  final String? customerName;
  final String? customerPhone;
  final List<OrderItemEntity> items;
  final UserAddress deliveryAddress;
  final String serviceCategoryId; // e.g. 'cat_products' or 'cat_home_services'

  // Provider / Shop Details
  final String? providerId;
  final String? providerName;
  final String? providerPhone;
  final String? pickupAddress;
  final double? pickupLatitude;
  final double? pickupLongitude;

  // Vehicle & Trip Details (Phase 7)
  final String? destinationAddress;
  final double? destinationLatitude;
  final double? destinationLongitude;
  final double? tripDistanceKm;
  final String? cancellationReason;
  final DateTime? cancelledAt;
  final double? rating;
  final String? reviewComment;

  // Delivery & Dispatch Details
  final String? assignedDeliveryId;
  final String? assignedDeliveryName;
  final String? offeredToDriverId;
  final List<String> rejectedDriverIds;
  final OrderAssignmentStatus assignmentStatus;

  // Financial figures (Delivery Fee is strictly 0.0 JOD)
  final double subtotal;
  final double deliveryFee;
  final double discount;
  final double totalAmount;

  final String paymentMethod;
  final OrderStatus status;
  final String? notes;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const OrderEntity({
    required this.id,
    this.customerId,
    this.customerName,
    this.customerPhone,
    required this.items,
    required this.deliveryAddress,
    this.serviceCategoryId = 'cat_products',
    this.providerId,
    this.providerName,
    this.providerPhone,
    this.pickupAddress,
    this.pickupLatitude,
    this.pickupLongitude,
    this.destinationAddress,
    this.destinationLatitude,
    this.destinationLongitude,
    this.tripDistanceKm,
    this.cancellationReason,
    this.cancelledAt,
    this.rating,
    this.reviewComment,
    this.assignedDeliveryId,
    this.assignedDeliveryName,
    this.offeredToDriverId,
    this.rejectedDriverIds = const [],
    this.assignmentStatus = OrderAssignmentStatus.unassigned,
    required this.subtotal,
    this.deliveryFee = 0.0, // Strictly 0.00 JOD
    required this.discount,
    required this.totalAmount,
    required this.paymentMethod,
    this.status = OrderStatus.confirmed,
    this.notes,
    required this.createdAt,
    this.updatedAt,
  });

  String get primaryItemTitleAr => items.isNotEmpty ? items.first.serviceNameAr : 'طلب بتنحل';
  String get primaryItemTitleEn => items.isNotEmpty ? items.first.serviceNameEn : 'btin7al Order';

  bool get isActive =>
      status == OrderStatus.pending ||
      status == OrderStatus.confirmed ||
      status == OrderStatus.offeredToDriver ||
      status == OrderStatus.awaitingAssignment ||
      status == OrderStatus.accepted ||
      status == OrderStatus.goingToPickup ||
      status == OrderStatus.pickedUp ||
      status == OrderStatus.goingToCustomer;

  OrderEntity copyWith({
    String? id,
    String? customerId,
    String? customerName,
    String? customerPhone,
    List<OrderItemEntity>? items,
    UserAddress? deliveryAddress,
    String? serviceCategoryId,
    String? providerId,
    String? providerName,
    String? providerPhone,
    String? pickupAddress,
    double? pickupLatitude,
    double? pickupLongitude,
    String? destinationAddress,
    double? destinationLatitude,
    double? destinationLongitude,
    double? tripDistanceKm,
    String? cancellationReason,
    DateTime? cancelledAt,
    double? rating,
    String? reviewComment,
    String? assignedDeliveryId,
    String? assignedDeliveryName,
    String? offeredToDriverId,
    List<String>? rejectedDriverIds,
    OrderAssignmentStatus? assignmentStatus,
    double? subtotal,
    double? deliveryFee,
    double? discount,
    double? totalAmount,
    String? paymentMethod,
    OrderStatus? status,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return OrderEntity(
      id: id ?? this.id,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      items: items ?? this.items,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      serviceCategoryId: serviceCategoryId ?? this.serviceCategoryId,
      providerId: providerId ?? this.providerId,
      providerName: providerName ?? this.providerName,
      providerPhone: providerPhone ?? this.providerPhone,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      pickupLatitude: pickupLatitude ?? this.pickupLatitude,
      pickupLongitude: pickupLongitude ?? this.pickupLongitude,
      destinationAddress: destinationAddress ?? this.destinationAddress,
      destinationLatitude: destinationLatitude ?? this.destinationLatitude,
      destinationLongitude: destinationLongitude ?? this.destinationLongitude,
      tripDistanceKm: tripDistanceKm ?? this.tripDistanceKm,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      rating: rating ?? this.rating,
      reviewComment: reviewComment ?? this.reviewComment,
      assignedDeliveryId: assignedDeliveryId ?? this.assignedDeliveryId,
      assignedDeliveryName: assignedDeliveryName ?? this.assignedDeliveryName,
      offeredToDriverId: offeredToDriverId ?? this.offeredToDriverId,
      rejectedDriverIds: rejectedDriverIds ?? this.rejectedDriverIds,
      assignmentStatus: assignmentStatus ?? this.assignmentStatus,
      subtotal: subtotal ?? this.subtotal,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      discount: discount ?? this.discount,
      totalAmount: totalAmount ?? this.totalAmount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

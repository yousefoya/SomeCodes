import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:al7btin_app/core/errors/failures.dart';
import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:al7btin_app/features/checkout/presentation/controllers/cart_controller.dart';
import 'package:al7btin_app/features/checkout/presentation/controllers/cart_state.dart';
import 'package:al7btin_app/features/delivery/presentation/controllers/delivery_controller.dart';
import 'package:al7btin_app/features/orders/domain/entities/order_entity.dart';
import 'package:al7btin_app/features/providers/domain/entities/provider_entity.dart';
import 'package:al7btin_app/features/providers/presentation/controllers/providers_controller.dart';

/// StateNotifier managing Customer Orders, Automatic Dispatch Engine, and Delivery Pipeline
class OrdersController extends StateNotifier<List<OrderEntity>> {
  final Ref _ref;

  OrdersController(this._ref) : super([]); // Clean production initial state (no fake demo orders)

  /// Haversine distance calculator between two GPS coordinates in Kilometers
  static double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371.0; // Earth radius in km
    final dLat = (lat2 - lat1) * pi / 180.0;
    final dLon = (lon2 - lon1) * pi / 180.0;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180.0) * cos(lat2 * pi / 180.0) * sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return r * c;
  }

  /// Places an order with strict authentication verification, 0 JOD delivery fee, provider association, and optional automatic dispatch
  OrderEntity placeOrder({
    required CartState cart,
    required UserAddress address,
    String? notes,
    bool autoDispatch = true,
  }) {
    final authState = _ref.read(authControllerProvider);
    final currentUser = authState.user;

    // Security Gate: Unauthenticated users MUST NOT create orders
    if (!authState.isAuthenticated || currentUser == null) {
      throw const AuthFailure('يرجى تسجيل الدخول أو إنشاء حساب جديد لإتمام الطلب');
    }

    if (cart.isEmpty) {
      throw const ValidationFailure('سلة الطلب فارغة');
    }

    final randomId = 'ORD-${10000 + Random().nextInt(90000)}';

    final orderItems = cart.items.map((cartItem) {
      return OrderItemEntity.fromCartItem(cartItem);
    }).toList();

    // Determine primary service category (e.g. Products delivery vs Home services)
    final serviceCategory = cart.items.any((it) => it.isHomeService) ? 'cat_home_services' : 'cat_products';

    // Associate Provider / Shop offering the cart's items
    final providers = _ref.read(providersControllerProvider);
    ProviderEntity? matchingProvider;
    try {
      final itemServiceIds = cart.items.map((i) => i.serviceId).toSet();
      final eligibleProviders = providers.where((p) {
        if (!p.isActive) return false;
        if (p.serviceIds.isNotEmpty && itemServiceIds.isNotEmpty) {
          final providesAndAvailable = itemServiceIds.every((sId) => p.isServiceAvailable(sId));
          if (providesAndAvailable) return true;
        }
        return p.serviceCategories.contains(serviceCategory);
      }).toList();

      if (eligibleProviders.isNotEmpty) {
        final destLat = address.location.latitude;
        final destLng = address.location.longitude;
        eligibleProviders.sort((a, b) {
          final distA = calculateDistanceKm(a.latitude, a.longitude, destLat, destLng);
          final distB = calculateDistanceKm(b.latitude, b.longitude, destLat, destLng);
          return distA.compareTo(distB);
        });
        matchingProvider = eligibleProviders.first;
      }
    } catch (_) {
      matchingProvider = providers.isNotEmpty ? providers.first : null;
    }

    final initialOrder = OrderEntity(
      id: randomId,
      customerId: currentUser.id,
      customerName: currentUser.name ?? 'عميل بتنحل',
      customerPhone: currentUser.phoneNumber,
      items: orderItems,
      deliveryAddress: address,
      serviceCategoryId: serviceCategory,
      providerId: matchingProvider?.id,
      providerName: matchingProvider?.nameAr,
      providerPhone: matchingProvider?.phoneNumber,
      pickupAddress: matchingProvider?.address,
      pickupLatitude: matchingProvider?.latitude,
      pickupLongitude: matchingProvider?.longitude,
      subtotal: cart.subtotal,
      deliveryFee: 0.0, // Strictly 0.00 JOD
      discount: cart.discountAmount,
      totalAmount: cart.totalAmount, // subtotal - discount
      paymentMethod: _formatPaymentMethod(cart.selectedPaymentMethod),
      status: OrderStatus.confirmed,
      notes: notes ?? cart.orderNotes,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    // If autoDispatch requested, run engine, otherwise direct provider fulfillment
    final finalOrder = autoDispatch ? _autoDispatchOrder(initialOrder) : initialOrder;

    // Prepend to order list
    state = [finalOrder, ...state];

    // Clear Customer Cart
    _ref.read(cartControllerProvider.notifier).clearCart();

    return finalOrder;
  }

  /// Customer or Provider cancels order with cancellation reason
  void cancelOrder(String orderId, {String? reason}) {
    state = state.map((order) {
      if (order.id == orderId) {
        return order.copyWith(
          status: OrderStatus.cancelled,
          cancellationReason: reason ?? 'تم إلغاء الطلب بواسطة العميل',
          cancelledAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();
  }

  /// Customer submits a rating and review comment for a completed order
  void submitReview(String orderId, {required double rating, String? comment}) {
    state = state.map((order) {
      if (order.id == orderId) {
        return order.copyWith(
          rating: rating,
          reviewComment: comment,
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();
  }

  /// Provider updates order status during fulfillment and delivery (confirmed -> accepted -> goingToCustomer -> completed)
  void providerUpdateOrderStatus(String orderId, OrderStatus newStatus) {
    state = state.map((order) {
      if (order.id == orderId) {
        return order.copyWith(
          status: newStatus,
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();
  }

  /// Automatic Dispatch Engine: Finds nearest eligible online delivery driver for the service category
  OrderEntity _autoDispatchOrder(OrderEntity order) {
    final drivers = _ref.read(deliveryEmployeesControllerProvider);

    // 1. Filter drivers: Active + Online + Category Authorized + Not previously rejected
    final eligibleDrivers = drivers.where((d) {
      final isCategoryAuth = d.isAuthorizedForCategory(order.serviceCategoryId);
      final isNotRejected = !order.rejectedDriverIds.contains(d.id);
      return d.isActive && d.isOnline && isCategoryAuth && isNotRejected;
    }).toList();

    // 2. Proximity sort: Distance to Provider pickup location (or Amman center fallback)
    final pickupLat = order.pickupLatitude ?? 31.9539;
    final pickupLng = order.pickupLongitude ?? 35.9106;

    if (eligibleDrivers.isNotEmpty) {
      eligibleDrivers.sort((a, b) {
        final distA = calculateDistanceKm(a.latitude, a.longitude, pickupLat, pickupLng);
        final distB = calculateDistanceKm(b.latitude, b.longitude, pickupLat, pickupLng);
        return distA.compareTo(distB);
      });

      final bestDriver = eligibleDrivers.first;

      return order.copyWith(
        offeredToDriverId: bestDriver.id,
        assignmentStatus: OrderAssignmentStatus.offered,
        status: OrderStatus.offeredToDriver,
        updatedAt: DateTime.now(),
      );
    } else {
      // Direct Provider Fulfillment: Provider manages internal fulfillment & delivery
      return order.copyWith(
        offeredToDriverId: null,
        assignmentStatus: OrderAssignmentStatus.unassigned,
        status: OrderStatus.awaitingAssignment,
        updatedAt: DateTime.now(),
      );
    }
  }

  /// Admin updates order status and optionally re-routes to another Provider
  void adminUpdateOrderStatus({
    required String orderId,
    required OrderStatus newStatus,
    String? newProviderId,
    String? newProviderName,
    String? newProviderPhone,
    String? newPickupAddress,
    double? newPickupLatitude,
    double? newPickupLongitude,
  }) {
    state = state.map((order) {
      if (order.id == orderId) {
        return order.copyWith(
          status: newStatus,
          providerId: newProviderId ?? order.providerId,
          providerName: newProviderName ?? order.providerName,
          providerPhone: newProviderPhone ?? order.providerPhone,
          pickupAddress: newPickupAddress ?? order.pickupAddress,
          pickupLatitude: newPickupLatitude ?? order.pickupLatitude,
          pickupLongitude: newPickupLongitude ?? order.pickupLongitude,
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();
  }

  /// Delivery Driver accepts the offered order
  void driverAcceptOrder(String orderId, String driverId) {
    final driver = _ref.read(deliveryEmployeesControllerProvider).firstWhere((d) => d.id == driverId);

    state = state.map((order) {
      if (order.id == orderId) {
        return order.copyWith(
          assignedDeliveryId: driver.id,
          assignedDeliveryName: driver.name,
          assignmentStatus: OrderAssignmentStatus.assigned,
          status: OrderStatus.accepted,
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();

    _ref.read(deliveryEmployeesControllerProvider.notifier).incrementActiveOrders(driverId);
  }

  /// Delivery Driver rejects the offered order -> Automatically re-dispatches to next closest eligible driver
  void driverRejectOrder(String orderId, String driverId) {
    OrderEntity? reDispatched;

    state = state.map((order) {
      if (order.id == orderId) {
        final updatedRejectedList = [...order.rejectedDriverIds, driverId];
        final rejectedOrder = order.copyWith(
          rejectedDriverIds: updatedRejectedList,
          offeredToDriverId: null,
          assignmentStatus: OrderAssignmentStatus.rejected,
          updatedAt: DateTime.now(),
        );

        // Attempt immediate re-dispatch
        reDispatched = _autoDispatchOrder(rejectedOrder);
        return reDispatched!;
      }
      return order;
    }).toList();
  }

  /// Driver updates order status along the delivery pipeline
  void driverUpdatePipelineStatus(String orderId, OrderStatus newStatus) {
    state = state.map((order) {
      if (order.id == orderId) {
        if (newStatus == OrderStatus.completed && order.assignedDeliveryId != null) {
          _ref
              .read(deliveryEmployeesControllerProvider.notifier)
              .completeOrderForDriver(order.assignedDeliveryId!);
        }
        return order.copyWith(
          status: newStatus,
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();
  }

  /// Admin Manual Override to assign / reassign any order to a specific driver
  void adminManualAssign({
    required String orderId,
    required String deliveryEmployeeId,
    required String deliveryEmployeeName,
  }) {
    state = state.map((order) {
      if (order.id == orderId) {
        return order.copyWith(
          assignedDeliveryId: deliveryEmployeeId,
          assignedDeliveryName: deliveryEmployeeName,
          assignmentStatus: OrderAssignmentStatus.assigned,
          status: OrderStatus.assigned,
          updatedAt: DateTime.now(),
        );
      }
      return order;
    }).toList();

    _ref.read(deliveryEmployeesControllerProvider.notifier).incrementActiveOrders(deliveryEmployeeId);
  }

  /// Updates order status directly
  void updateOrderStatus(String orderId, OrderStatus newStatus) {
    driverUpdatePipelineStatus(orderId, newStatus);
  }

  /// Assign order alias for backwards compatibility
  void assignOrder({
    required String orderId,
    required String deliveryEmployeeId,
    required String deliveryEmployeeName,
  }) {
    adminManualAssign(
      orderId: orderId,
      deliveryEmployeeId: deliveryEmployeeId,
      deliveryEmployeeName: deliveryEmployeeName,
    );
  }

  String _formatPaymentMethod(String methodKey) {
    switch (methodKey) {
      case 'cashOnDelivery':
      case 'cash_on_delivery':
        return 'الدفع عند الاستلام (Cash on Delivery)';
      case 'card':
        return 'بطاقة ائتمانية (Credit/Debit Card)';
      case 'wallet':
        return 'رصيد المحفظة (Wallet Balance)';
      case 'applePay':
        return 'Apple Pay';
      default:
        return 'الدفع عند الاستلام';
    }
  }
}

/// Global provider for OrdersController
final ordersControllerProvider = StateNotifierProvider<OrdersController, List<OrderEntity>>((ref) {
  return OrdersController(ref);
});

/// Provider for orders assigned or offered to a specific delivery employee
final deliveryAssignedOrdersProvider = Provider.family<List<OrderEntity>, String>((ref, driverId) {
  final orders = ref.watch(ordersControllerProvider);
  return orders
      .where((o) => o.assignedDeliveryId == driverId || o.offeredToDriverId == driverId)
      .toList();
});

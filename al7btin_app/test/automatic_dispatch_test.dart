import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/auth/data/repositories/mock_auth_repository.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:al7btin_app/features/checkout/presentation/controllers/cart_controller.dart';
import 'package:al7btin_app/features/delivery/presentation/controllers/delivery_controller.dart';
import 'package:al7btin_app/features/orders/domain/entities/order_entity.dart';
import 'package:al7btin_app/features/orders/presentation/controllers/orders_controller.dart';
import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';

import 'package:al7btin_app/features/delivery/data/repositories/mock_delivery_repository.dart';
import 'package:al7btin_app/features/providers/data/repositories/mock_provider_repository.dart';
import 'package:al7btin_app/features/providers/presentation/controllers/providers_controller.dart';

void main() {
  group('Automatic Delivery Dispatch Engine Tests', () {
    late ProviderContainer container;

    final gasService = ServiceEntity(
      id: 'srv_gas',
      categoryId: 'cat_products',
      nameAr: 'غاز منزلي',
      nameEn: 'Home Gas',
      descriptionAr: 'غاز',
      descriptionEn: 'Gas',
      type: ServiceType.deliveryProduct,
      basePrice: 7.0,
      unitAr: 'أسطوانة',
      unitEn: 'cylinder',
      createdAt: DateTime.now(),
    );

    final electricalService = ServiceEntity(
      id: 'srv_electrical',
      categoryId: 'cat_home_services',
      nameAr: 'صيانة كهرباء',
      nameEn: 'Electrical Maintenance',
      descriptionAr: 'كهرباء',
      descriptionEn: 'Electrical',
      type: ServiceType.homeService,
      basePrice: 15.0,
      unitAr: 'كشفية',
      unitEn: 'visit',
      requiresQuotation: true,
      createdAt: DateTime.now(),
    );

    const ammanAddress = UserAddress(
      id: 'ADDR-AMMAN',
      title: 'المنزل',
      city: 'عمان',
      area: 'خلدا',
      streetAddress: 'شارع وصفي التل',
      location: GeoPoint(latitude: 31.9892, longitude: 35.8456),
    );

    setUp(() async {
      container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            MockAuthRepository(networkDelay: Duration.zero),
          ),
          providerRepositoryProvider.overrideWithValue(
            MockProviderRepository(networkDelay: Duration.zero),
          ),
          deliveryRepositoryProvider.overrideWithValue(
            MockDeliveryRepository(),
          ),
        ],
      );

      // Authenticate customer session
      await container.read(authControllerProvider.notifier).sendOtp('0791234567');
      await container.read(authControllerProvider.notifier).verifyOtp('1234');
      await container.read(providersControllerProvider.notifier).loadProviders();
      await container.read(deliveryEmployeesControllerProvider.notifier).loadDeliveryEmployees();
    });

    tearDown(() {
      container.dispose();
    });

    test('Haversine distance calculation is mathematically accurate', () {
      // Amman Khalda (31.9892, 35.8456) to Amman Shmeisani (31.9688, 35.8942) is approx 5.1 km
      final dist = OrdersController.calculateDistanceKm(31.9892, 35.8456, 31.9688, 35.8942);
      expect(dist, greaterThan(4.0));
      expect(dist, lessThan(6.5));
    });

    test('Products order (Gas) is offered to closest eligible products driver', () {
      final cartNotifier = container.read(cartControllerProvider.notifier);
      cartNotifier.addToCart(gasService, quantity: 1);

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final order = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: ammanAddress,
      );

      expect(order.serviceCategoryId, equals('cat_products'));
      expect(order.status, equals(OrderStatus.offeredToDriver));
      expect(order.assignmentStatus, equals(OrderAssignmentStatus.offered));
      expect(order.offeredToDriverId, isNotNull);

      // Driver DRV-101 (Ahmad in Khalda: 31.9850, 35.8500) is closest to Gas Hub in Khalda (31.9892, 35.8456)
      expect(order.offeredToDriverId, equals('DRV-101'));
    });

    test('Home Service order (Electrical) is offered only to home-services authorized driver', () {
      final cartNotifier = container.read(cartControllerProvider.notifier);
      cartNotifier.addToCart(electricalService, quantity: 1);

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final order = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: ammanAddress,
      );

      expect(order.serviceCategoryId, equals('cat_home_services'));
      expect(order.status, equals(OrderStatus.offeredToDriver));

      // DRV-101 is NOT authorized for cat_home_services (only cat_products).
      // DRV-103 (Mohammad in Shmeisani) and DRV-102 (Tareq in Tabarbour) are authorized.
      expect(order.offeredToDriverId, anyOf(equals('DRV-103'), equals('DRV-102')));
      expect(order.offeredToDriverId, isNot(equals('DRV-101')));
    });

    test('When driver rejects offered order, system automatically re-dispatches to next closest driver', () {
      final cartNotifier = container.read(cartControllerProvider.notifier);
      cartNotifier.addToCart(gasService, quantity: 1);

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final order = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: ammanAddress,
      );

      final firstDriverId = order.offeredToDriverId!;
      expect(firstDriverId, equals('DRV-101'));

      // First driver declines / rejects
      ordersCtrl.driverRejectOrder(order.id, firstDriverId);

      final updatedOrder = container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id);
      expect(updatedOrder.rejectedDriverIds, contains('DRV-101'));

      // Should automatically re-dispatch to second eligible driver (DRV-102 Tareq)
      expect(updatedOrder.offeredToDriverId, equals('DRV-102'));
      expect(updatedOrder.status, equals(OrderStatus.offeredToDriver));
    });

    test('When all eligible drivers reject or are offline, order transitions to awaitingAssignment without silent assignment', () {
      // Toggle all drivers offline
      final deliveryCtrl = container.read(deliveryEmployeesControllerProvider.notifier);
      final drivers = container.read(deliveryEmployeesControllerProvider);
      for (final d in drivers) {
        deliveryCtrl.toggleOnlineStatus(d.id);
      }

      final cartNotifier = container.read(cartControllerProvider.notifier);
      cartNotifier.addToCart(gasService, quantity: 1);

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final order = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: ammanAddress,
      );

      expect(order.status, equals(OrderStatus.awaitingAssignment));
      expect(order.assignmentStatus, equals(OrderAssignmentStatus.unassigned));
      expect(order.offeredToDriverId, isNull);
      expect(order.assignedDeliveryId, isNull);
    });

    test('Admin can manually assign or override any order to a specific driver', () {
      final cartNotifier = container.read(cartControllerProvider.notifier);
      cartNotifier.addToCart(gasService, quantity: 1);

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final order = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: ammanAddress,
      );

      // Admin overrides assignment to DRV-102
      ordersCtrl.adminManualAssign(
        orderId: order.id,
        deliveryEmployeeId: 'DRV-102',
        deliveryEmployeeName: 'طارق الزعبي',
      );

      final updatedOrder = container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id);
      expect(updatedOrder.assignedDeliveryId, equals('DRV-102'));
      expect(updatedOrder.assignedDeliveryName, equals('طارق الزعبي'));
      expect(updatedOrder.status, equals(OrderStatus.assigned));
      expect(updatedOrder.assignmentStatus, equals(OrderAssignmentStatus.assigned));
    });
  });
}

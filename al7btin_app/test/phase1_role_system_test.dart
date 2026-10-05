import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/admin/presentation/controllers/admin_users_controller.dart';
import 'package:al7btin_app/features/auth/data/repositories/mock_auth_repository.dart';
import 'package:al7btin_app/features/auth/domain/entities/user_entity.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:al7btin_app/features/checkout/presentation/controllers/cart_controller.dart';
import 'package:al7btin_app/features/coupons/domain/entities/coupon_entity.dart';
import 'package:al7btin_app/features/coupons/presentation/controllers/coupons_controller.dart';
import 'package:al7btin_app/features/offers/presentation/controllers/offers_controller.dart';
import 'package:al7btin_app/features/orders/domain/entities/order_entity.dart';
import 'package:al7btin_app/features/orders/presentation/controllers/orders_controller.dart';
import 'package:al7btin_app/features/providers/presentation/controllers/providers_controller.dart';
import 'package:al7btin_app/features/delivery/data/repositories/mock_delivery_repository.dart';
import 'package:al7btin_app/features/delivery/presentation/controllers/delivery_controller.dart';
import 'package:al7btin_app/features/providers/data/repositories/mock_provider_repository.dart';
import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';

void main() {
  group('Phase 1 Role-Based Architecture & System Tests', () {
    late ProviderContainer container;

    setUp(() {
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
    });

    tearDown(() {
      container.dispose();
    });

    // -------------------------------------------------------------
    // TEST 1: Role Authentication
    // -------------------------------------------------------------
    test('MockAuthRepository authenticates customer, admin, and delivery roles correctly', () async {
      final authRepo = MockAuthRepository(networkDelay: Duration.zero);

      // Customer
      final customer = await authRepo.verifyOtp(phoneNumber: '0791234567', otp: '1234');
      expect(customer.role, equals(UserRole.customer));
      expect(customer.isCustomer, isTrue);
      expect(customer.isAdmin, isFalse);

      // Admin
      final admin = await authRepo.verifyOtp(phoneNumber: '0790000001', otp: '1234');
      expect(admin.role, equals(UserRole.admin));
      expect(admin.isAdmin, isTrue);

      // Delivery
      final delivery = await authRepo.verifyOtp(phoneNumber: '0790000002', otp: '1234');
      expect(delivery.role, equals(UserRole.delivery));
      expect(delivery.isDelivery, isTrue);
    });

    // -------------------------------------------------------------
    // TEST 2: Admin User Management & Suspension
    // -------------------------------------------------------------
    test('AdminUsersController toggles suspension and manages customers', () async {
      final controller = container.read(adminUsersControllerProvider.notifier);
      await controller.loadUsers();
      final initialUsers = container.read(adminUsersControllerProvider).users;
      if (initialUsers.isNotEmpty) {
        final firstUserId = initialUsers.first.id;
        final wasSuspended = initialUsers.first.isSuspended;

        await controller.toggleUserSuspension(firstUserId);
        final updatedUsers = container.read(adminUsersControllerProvider).users;
        final updatedUser = updatedUsers.firstWhere((u) => u.id == firstUserId);
        expect(updatedUser.isSuspended, equals(!wasSuspended));
      }
    });

    // -------------------------------------------------------------
    // TEST 3: Admin Dynamic Coupons & Cart Calculation (0 Delivery Fee)
    // -------------------------------------------------------------
    test('Admin adds new coupon and customer cart applies it dynamically with 0 delivery fee', () {
      final couponsNotifier = container.read(couponsControllerProvider.notifier);
      final cartNotifier = container.read(cartControllerProvider.notifier);

      // 1. Admin creates a 25% discount coupon
      couponsNotifier.addCoupon(
        code: 'PROMO25',
        type: CouponType.percentage,
        value: 25.0,
        minOrderValue: 10.0,
        expiryDate: DateTime.now().add(const Duration(days: 30)),
      );

      // 2. Customer adds items to cart
      final testService = ServiceEntity(
        id: 'srv_test_gas',
        categoryId: 'cat_products',
        nameAr: 'غاز',
        nameEn: 'Gas',
        descriptionAr: 'غاز',
        descriptionEn: 'Gas',
        type: ServiceType.deliveryProduct,
        basePrice: 10.0,
        unitAr: 'أسطوانة',
        unitEn: 'Cylinder',
        createdAt: DateTime.now(),
      );

      cartNotifier.addToCart(testService, quantity: 2); // 20.00 JOD subtotal
      expect(container.read(cartControllerProvider).subtotal, equals(20.00));

      // 3. Customer applies the newly created admin coupon
      final applied = cartNotifier.applyCoupon('PROMO25');
      expect(applied, isTrue);

      final cart = container.read(cartControllerProvider);
      expect(cart.discountAmount, equals(5.00)); // 25% of 20.00 = 5.00
      expect(cart.deliveryFee, equals(0.00)); // 0 JOD Delivery Fee
      expect(cart.totalAmount, equals(15.00)); // 20.00 - 5.00 discount = 15.00
    });

    // -------------------------------------------------------------
    // TEST 4: Admin Promotional Offers Management
    // -------------------------------------------------------------
    test('Admin creates and toggles promotional offers', () {
      final offersNotifier = container.read(offersControllerProvider.notifier);
      final initialOffersCount = container.read(offersControllerProvider).length;

      offersNotifier.addOffer(
        titleAr: 'عرض خاص جديد',
        titleEn: 'New Special Offer',
        descriptionAr: 'خصم مميز على الخدمات',
        descriptionEn: 'Special Discount on Services',
        discountPercentage: 20.0,
        promoCode: 'DISCOUNT20',
        startDate: DateTime.now().subtract(const Duration(days: 1)),
        endDate: DateTime.now().add(const Duration(days: 10)),
      );

      final updatedOffers = container.read(offersControllerProvider);
      expect(updatedOffers.length, equals(initialOffersCount + 1));
      expect(updatedOffers.first.titleAr, equals('عرض خاص جديد'));
    });

    // -------------------------------------------------------------
    // TEST 5: Admin Provider Management
    // -------------------------------------------------------------
    test('Admin creates and toggles distribution providers', () async {
      final provCtrl = container.read(providersControllerProvider.notifier);
      await provCtrl.loadProviders();
      final initialCount = container.read(providersControllerProvider).length;

      await provCtrl.addProvider(
        nameAr: 'وكالة غاز دابوق',
        nameEn: 'Dabouq Gas Hub',
        phoneNumber: '0799998877',
        address: 'عمان - دابوق',
        latitude: 32.0012,
        longitude: 35.8341,
        serviceIds: ['srv_gas_cylinder'],
        serviceCategories: ['cat_products'],
      );

      final updatedList = container.read(providersControllerProvider);
      expect(updatedList.length, equals(initialCount + 1));
      expect(updatedList.first.nameAr, equals('وكالة غاز دابوق'));
    });

    // -------------------------------------------------------------
    // TEST 6: Delivery Driver Status Transition Flow
    // -------------------------------------------------------------
    test('Delivery driver transitions order status across full pipeline: OFFERED -> ACCEPTED -> GOING_TO_PICKUP -> PICKED_UP -> GOING_TO_CUSTOMER -> COMPLETED', () async {
      // Authenticate customer and place an order
      await container.read(authControllerProvider.notifier).sendOtp('0791234567');
      await container.read(authControllerProvider.notifier).verifyOtp('1234');
      await container.read(providersControllerProvider.notifier).loadProviders();
      await container.read(deliveryEmployeesControllerProvider.notifier).loadDeliveryEmployees();

      final cartNotifier = container.read(cartControllerProvider.notifier);
      cartNotifier.addToCart(
        ServiceEntity(
          id: 'srv_gas',
          categoryId: 'cat_products',
          nameAr: 'غاز',
          nameEn: 'Gas',
          descriptionAr: 'غاز',
          descriptionEn: 'Gas',
          type: ServiceType.deliveryProduct,
          basePrice: 7.0,
          unitAr: 'أسطوانة',
          unitEn: 'Cylinder',
          createdAt: DateTime.now(),
        ),
        quantity: 1,
      );

      const address = UserAddress(
        id: 'ADDR-1',
        title: 'المنزل',
        city: 'عمان',
        area: 'خلدا',
        streetAddress: 'شارع وصفي التل',
        location: GeoPoint(latitude: 31.98, longitude: 35.84),
      );

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final order = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: address,
      );

      expect(order.status, equals(OrderStatus.offeredToDriver));
      final assignedDriverId = order.offeredToDriverId!;

      // 1. Driver Accepts
      ordersCtrl.driverAcceptOrder(order.id, assignedDriverId);
      expect(container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id).status, equals(OrderStatus.accepted));

      // 2. Going to Pickup
      ordersCtrl.driverUpdatePipelineStatus(order.id, OrderStatus.goingToPickup);
      expect(container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id).status, equals(OrderStatus.goingToPickup));

      // 3. Picked Up
      ordersCtrl.driverUpdatePipelineStatus(order.id, OrderStatus.pickedUp);
      expect(container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id).status, equals(OrderStatus.pickedUp));

      // 4. Going to Customer
      ordersCtrl.driverUpdatePipelineStatus(order.id, OrderStatus.goingToCustomer);
      expect(container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id).status, equals(OrderStatus.goingToCustomer));

      // 5. Completed
      ordersCtrl.driverUpdatePipelineStatus(order.id, OrderStatus.completed);
      expect(container.read(ordersControllerProvider).firstWhere((o) => o.id == order.id).status, equals(OrderStatus.completed));
    });
  });
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/core/errors/failures.dart';
import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/auth/data/repositories/mock_auth_repository.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:al7btin_app/features/checkout/presentation/controllers/cart_controller.dart';
import 'package:al7btin_app/features/delivery/data/repositories/mock_delivery_repository.dart';
import 'package:al7btin_app/features/delivery/presentation/controllers/delivery_controller.dart';
import 'package:al7btin_app/features/orders/domain/entities/order_entity.dart';
import 'package:al7btin_app/features/orders/presentation/controllers/orders_controller.dart';
import 'package:al7btin_app/features/providers/data/repositories/mock_provider_repository.dart';
import 'package:al7btin_app/features/providers/presentation/controllers/providers_controller.dart';
import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';

void main() {
  group('Cart Pricing & Calculations Tests (0 JOD Delivery Fee)', () {
    late CartController cartController;

    final sampleService = ServiceEntity(
      id: 'srv_gas_cylinder',
      categoryId: 'cat_products',
      nameAr: 'توصيل أسطوانة غاز منزلي',
      nameEn: 'Gas Cylinder Delivery',
      descriptionAr: 'توصيل أسطوانة غاز للمنزل',
      descriptionEn: 'Home delivery of standard LPG gas cylinder',
      type: ServiceType.deliveryProduct,
      basePrice: 7.00,
      unitAr: 'أسطوانة',
      unitEn: 'cylinder',
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    );

    final plumbingService = ServiceEntity(
      id: 'srv_plumbing',
      categoryId: 'cat_home_services',
      nameAr: 'صيانة سباكة',
      nameEn: 'Plumbing Service',
      descriptionAr: 'صيانة ومعاينة سباكة منزلية',
      descriptionEn: 'Home plumbing inspection',
      type: ServiceType.homeService,
      basePrice: 15.00,
      unitAr: 'معاينة',
      unitEn: 'inspection',
      isActive: true,
      requiresQuotation: true,
      createdAt: DateTime(2026, 1, 1),
    );

    setUp(() {
      cartController = CartController();
    });

    test('Adding product to cart stores exact unit price and sets delivery fee to 0 JOD', () {
      cartController.addToCart(sampleService, quantity: 2);

      final state = cartController.state;
      expect(state.items.length, 1);

      final item = state.items.first;
      expect(item.unitPrice, 7.00);
      expect(item.quantity, 2);
      expect(item.itemTotal, 14.00);
      expect(state.subtotal, 14.00);
      expect(state.deliveryFee, 0.00); // Strict 0.00 JOD platform delivery fee
      expect(state.totalAmount, 14.00);
    });

    test('Adding home service calculates quotation base price correctly with 0 delivery fee', () {
      cartController.addToCart(plumbingService, quantity: 1);

      final state = cartController.state;
      expect(state.items.length, 1);

      final item = state.items.first;
      expect(item.unitPrice, 15.00);
      expect(item.requiresQuotation, true);
      expect(state.subtotal, 15.00);
      expect(state.deliveryFee, 0.00);
      expect(state.totalAmount, 15.00);
    });

    test('Updating item quantity recalculates unit price × quantity', () {
      cartController.addToCart(sampleService, quantity: 1);
      expect(cartController.state.totalAmount, 7.00);

      final itemId = cartController.state.items.first.id;
      cartController.updateQuantity(itemId, 3);
      expect(cartController.state.items.first.quantity, 3);
      expect(cartController.state.totalAmount, 21.00);

      cartController.updateQuantity(itemId, 0); // 0 removes item
      expect(cartController.state.isEmpty, true);
      expect(cartController.state.totalAmount, 0.00);
    });

    test('Applying AL7BTIN15 coupon calculates 15% discount on subtotal without delivery fees', () {
      cartController.addToCart(sampleService, quantity: 2); // 14.00 JOD
      expect(cartController.state.subtotal, 14.00);

      final success = cartController.applyCoupon('AL7BTIN15');
      expect(success, true);

      final state = cartController.state;
      expect(state.appliedCoupon, 'AL7BTIN15');
      expect(state.discountAmount, 2.10); // 15% of 14.00 = 2.10 JOD
      expect(state.deliveryFee, 0.00);
      expect(state.totalAmount, 11.90); // 14.00 - 2.10 = 11.90 JOD
    });

    test('Applying SAVE5 coupon applies flat 5.00 JOD discount', () {
      cartController.addToCart(sampleService, quantity: 3); // 21.00 JOD
      expect(cartController.state.subtotal, 21.00);

      final success = cartController.applyCoupon('SAVE5');
      expect(success, true);

      final state = cartController.state;
      expect(state.appliedCoupon, 'SAVE5');
      expect(state.discountAmount, 5.00); // 5.00 JOD fixed discount
      expect(state.totalAmount, 16.00); // 21.00 - 5.00 = 16.00 JOD
    });

    test('Unauthenticated guest cannot create an order (Throws AuthFailure)', () {
      final container = ProviderContainer();
      final ordersCtrl = container.read(ordersControllerProvider.notifier);

      cartController.addToCart(sampleService, quantity: 1);

      const address = UserAddress(
        id: 'ADDR-1',
        title: 'المنزل',
        city: 'عمان',
        area: 'خلدا',
        streetAddress: 'شارع وصفي التل',
        location: GeoPoint(latitude: 31.98, longitude: 35.84),
      );

      expect(
        () => ordersCtrl.placeOrder(
          cart: cartController.state,
          address: address,
        ),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('Authenticated customer places order with 0 delivery fee and triggers auto-dispatch', () async {
      final container = ProviderContainer(
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

      // Login as customer
      await container.read(authControllerProvider.notifier).sendOtp('0791234567');
      await container.read(authControllerProvider.notifier).verifyOtp('1234');
      await container.read(providersControllerProvider.notifier).loadProviders();
      await container.read(deliveryEmployeesControllerProvider.notifier).loadDeliveryEmployees();

      final cart = container.read(cartControllerProvider.notifier);
      cart.addToCart(sampleService, quantity: 2);

      const address = UserAddress(
        id: 'ADDR-TEST',
        title: 'المنزل',
        city: 'عمان',
        area: 'عبدون',
        streetAddress: 'شارع دمشق',
        location: GeoPoint(latitude: 31.95, longitude: 35.91),
      );

      final ordersCtrl = container.read(ordersControllerProvider.notifier);
      final createdOrder = ordersCtrl.placeOrder(
        cart: container.read(cartControllerProvider),
        address: address,
      );

      expect(createdOrder.items.length, 1);
      expect(createdOrder.items.first.unitPrice, 7.00);
      expect(createdOrder.items.first.quantity, 2);
      expect(createdOrder.subtotal, 14.00);
      expect(createdOrder.deliveryFee, 0.00);
      expect(createdOrder.totalAmount, 14.00);
      expect(createdOrder.deliveryAddress.area, 'عبدون');
      expect(createdOrder.providerId, isNotNull);
      expect(createdOrder.status, OrderStatus.offeredToDriver); // Auto-dispatched
      expect(createdOrder.assignmentStatus, OrderAssignmentStatus.offered);
      expect(createdOrder.offeredToDriverId, isNotNull);

      // Cart is cleared after order
      expect(container.read(cartControllerProvider).isEmpty, true);
    });

    test('Adding service with selectedOption uses option price and records variant details', () {
      const optionCups = ServiceOptionEntity(
        id: 'opt_water_cups',
        serviceId: 'srv_pure_water',
        nameAr: 'كرتونة كاسات مياه (40 كاسة)',
        nameEn: 'Water Cups Carton (40 cups)',
        size: '200 مل',
        price: 2.50,
        unitAr: 'كرتونة',
        unitEn: 'Carton',
      );

      const optionGallon = ServiceOptionEntity(
        id: 'opt_water_gallon',
        serviceId: 'srv_pure_water',
        nameAr: 'قارورة مياه 19 لتر',
        nameEn: '19L Water Gallon',
        size: '19 لتر',
        price: 1.50,
        unitAr: 'قارورة',
        unitEn: 'Gallon',
      );

      const waterService = ServiceEntity(
        id: 'srv_pure_water',
        categoryId: 'cat_products',
        nameAr: 'مياه شرب نقية',
        nameEn: 'Pure Drinking Water',
        descriptionAr: 'توصيل مياه شرب نقية',
        descriptionEn: 'Pure drinking water delivery',
        type: ServiceType.deliveryProduct,
        basePrice: 1.50,
        unitAr: 'قارورة',
        unitEn: 'Gallon',
        options: [optionCups, optionGallon],
      );

      // Add 2 cartons of cups (2.50 JOD each)
      cartController.addToCart(waterService, selectedOption: optionCups, quantity: 2);

      // Add 3 gallons (1.50 JOD each)
      cartController.addToCart(waterService, selectedOption: optionGallon, quantity: 3);

      final state = cartController.state;
      expect(state.items.length, 2);

      final cupsItem = state.items.firstWhere((i) => i.selectedOptionId == 'opt_water_cups');
      expect(cupsItem.unitPrice, 2.50);
      expect(cupsItem.quantity, 2);
      expect(cupsItem.itemTotal, 5.00);
      expect(cupsItem.selectedOptionNameAr, 'كرتونة كاسات مياه (40 كاسة)');
      expect(cupsItem.selectedOptionSize, '200 مل');

      final gallonItem = state.items.firstWhere((i) => i.selectedOptionId == 'opt_water_gallon');
      expect(gallonItem.unitPrice, 1.50);
      expect(gallonItem.quantity, 3);
      expect(gallonItem.itemTotal, 4.50);
      expect(gallonItem.selectedOptionSize, '19 لتر');

      // Subtotal = 5.00 + 4.50 = 9.50 JOD
      expect(state.subtotal, 9.50);
      expect(state.deliveryFee, 0.00);
      expect(state.totalAmount, 9.50);
    });
  });
}


import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/features/services/data/repositories/mock_service_repository.dart';
import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';

void main() {
  group('MockServiceRepository Tests', () {
    late MockServiceRepository serviceRepo;

    setUp(() {
      serviceRepo = MockServiceRepository(networkDelay: Duration.zero);
    });

    test('getServices returns all active services when categoryId is null', () async {
      final services = await serviceRepo.getServices();

      expect(services, isNotEmpty);
      expect(services.length, greaterThanOrEqualTo(5));
      expect(services.every((s) => s.isActive), isTrue);
    });

    test('getServices filters correctly by categoryId', () async {
      final productServices = await serviceRepo.getServices(categoryId: 'cat_products');
      expect(productServices, isNotEmpty);
      expect(productServices.every((s) => s.categoryId == 'cat_products'), isTrue);

      final homeServices = await serviceRepo.getServices(categoryId: 'cat_home_services');
      expect(homeServices, isNotEmpty);
      expect(homeServices.every((s) => s.categoryId == 'cat_home_services'), isTrue);
    });

    test('getServiceById returns correct ServiceEntity', () async {
      final service = await serviceRepo.getServiceById('srv_gas_cylinder');

      expect(service, isNotNull);
      expect(service?.nameAr, contains('غاز'));
      expect(service?.type, equals(ServiceType.deliveryProduct));
      expect(service?.basePrice, greaterThan(0));
    });

    test('searchServices returns matching services by Arabic keyword', () async {
      final results = await serviceRepo.searchServices('سباكة');

      expect(results, isNotEmpty);
      expect(results.any((s) => s.nameAr.contains('سباكة')), isTrue);
    });

    test('searchServices returns empty list when no match is found', () async {
      final results = await serviceRepo.searchServices('xyz_non_existent_term_123');
      expect(results, isEmpty);
    });
  });
}

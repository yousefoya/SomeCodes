import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/features/categories/data/repositories/mock_category_repository.dart';

void main() {
  group('MockCategoryRepository Tests', () {
    late MockCategoryRepository categoryRepo;

    setUp(() {
      categoryRepo = MockCategoryRepository(networkDelay: Duration.zero);
    });

    test('getCategories returns non-empty list of active categories sorted by sortOrder', () async {
      final categories = await categoryRepo.getCategories();

      expect(categories, isNotEmpty);
      expect(categories.length, greaterThanOrEqualTo(3));
      expect(categories.every((c) => c.isActive), isTrue);

      // Verify sorting order
      for (int i = 0; i < categories.length - 1; i++) {
        expect(categories[i].sortOrder, lessThanOrEqualTo(categories[i + 1].sortOrder));
      }
    });

    test('getCategoryById returns valid CategoryEntity when found', () async {
      final category = await categoryRepo.getCategoryById('cat_products');

      expect(category, isNotNull);
      expect(category?.nameAr, contains('منتجات'));
      expect(category?.id, equals('cat_products'));
    });

    test('getCategoryById returns null when id does not exist', () async {
      final category = await categoryRepo.getCategoryById('non_existent_category');
      expect(category, isNull);
    });
  });
}

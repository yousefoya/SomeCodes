import '../entities/category_entity.dart';

/// Abstract contract for Category operations
abstract class ICategoryRepository {
  /// Fetch all active categories sorted by sortOrder
  Future<List<CategoryEntity>> getCategories();

  /// Fetch a single category by its unique identifier
  Future<CategoryEntity?> getCategoryById(String id);

  /// Admin: Create a new service category
  Future<CategoryEntity> createCategory(CategoryEntity category, {String? adminToken});

  /// Admin: Update an existing category
  Future<CategoryEntity> updateCategory(CategoryEntity category, {String? adminToken});

  /// Admin: Delete a category
  Future<void> deleteCategory(String id, {String? adminToken});
}

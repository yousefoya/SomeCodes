import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/api_category_repository.dart';
import '../../domain/entities/category_entity.dart';
import '../../domain/repositories/category_repository_interface.dart';

/// Provider for ICategoryRepository interface (connected to real backend)
final categoryRepositoryProvider = Provider<ICategoryRepository>((ref) {
  return ApiCategoryRepository();
});

/// AsyncProvider fetching all active categories from PostgreSQL backend
final categoriesProvider = FutureProvider<List<CategoryEntity>>((ref) async {
  final repository = ref.watch(categoryRepositoryProvider);
  return repository.getCategories();
});

/// Provider for currently selected category filter (null = all)
final selectedCategoryIdProvider = StateProvider<String?>((ref) => null);

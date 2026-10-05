import 'dart:async';
import '../../domain/entities/category_entity.dart';
import '../../domain/repositories/category_repository_interface.dart';

/// Mock in-memory implementation of ICategoryRepository with realistic dynamic data
class MockCategoryRepository implements ICategoryRepository {
  final Duration networkDelay;

  MockCategoryRepository({
    this.networkDelay = const Duration(milliseconds: 350),
  });

  final List<CategoryEntity> _mockCategories = [
    CategoryEntity(
      id: 'cat_products',
      nameAr: 'منتجات واحتياجات',
      nameEn: 'Products & Needs',
      descriptionAr: 'توصيل أسطوانات الغاز، المياه النقية، المحروقات، والاحتياجات الأساسية',
      descriptionEn: 'Delivery of gas cylinders, pure water, fuels, and essentials',
      iconName: 'local_shipping_rounded',
      isActive: true,
      sortOrder: 1,
      createdAt: DateTime(2026, 1, 1),
    ),
    CategoryEntity(
      id: 'cat_home_services',
      nameAr: 'خدمات منزلية',
      nameEn: 'Home Services',
      descriptionAr: 'صيانة الكهرباء، السباكة، التكييف، التدفئة، النجارة، والأقفال',
      descriptionEn: 'Electrical, plumbing, AC, heating, carpentry, and locks maintenance',
      iconName: 'home_repair_service_rounded',
      isActive: true,
      sortOrder: 2,
      createdAt: DateTime(2026, 1, 1),
    ),
    CategoryEntity(
      id: 'cat_offers',
      nameAr: 'عروض وكوبونات',
      nameEn: 'Offers & Coupons',
      descriptionAr: 'خصومات حصرية وباقات توفير مميزة للمستخدمين والطلبات المتكررة',
      descriptionEn: 'Exclusive discounts, packages, and seasonal promotional coupons',
      iconName: 'local_offer_rounded',
      isActive: true,
      sortOrder: 3,
      createdAt: DateTime(2026, 1, 1),
    ),
  ];

  @override
  Future<List<CategoryEntity>> getCategories() async {
    await Future<void>.delayed(networkDelay);
    return _mockCategories.where((c) => c.isActive).toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  }

  @override
  Future<CategoryEntity?> getCategoryById(String id) async {
    await Future<void>.delayed(networkDelay);
    try {
      return _mockCategories.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<CategoryEntity> createCategory(CategoryEntity category, {String? adminToken}) async {
    await Future<void>.delayed(networkDelay);
    _mockCategories.add(category);
    return category;
  }

  @override
  Future<CategoryEntity> updateCategory(CategoryEntity category, {String? adminToken}) async {
    await Future<void>.delayed(networkDelay);
    final idx = _mockCategories.indexWhere((c) => c.id == category.id);
    if (idx >= 0) {
      _mockCategories[idx] = category;
    }
    return category;
  }

  @override
  Future<void> deleteCategory(String id, {String? adminToken}) async {
    await Future<void>.delayed(networkDelay);
    _mockCategories.removeWhere((c) => c.id == id);
  }
}

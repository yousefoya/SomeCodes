import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:al7btin_app/features/categories/data/repositories/api_category_repository.dart';

void main() {
  group('ApiCategoryRepository Tests', () {
    test('getCategories fetches and parses categories from REST API', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/categories')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 'cat_products',
                  'nameAr': 'منتجات واحتياجات',
                  'nameEn': 'Products & Needs',
                  'iconName': 'local_gas_station_rounded',
                  'sortOrder': 1,
                  'isActive': true,
                },
                {
                  'id': 'cat_home_services',
                  'nameAr': 'خدمات صيانة منزلية',
                  'nameEn': 'Home Services',
                  'iconName': 'home_repair_service_rounded',
                  'sortOrder': 2,
                  'isActive': true,
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiCategoryRepository(client: mockClient);
      final categories = await repo.getCategories();

      expect(categories.length, equals(2));
      expect(categories[0].id, equals('cat_products'));
      expect(categories[0].nameAr, equals('منتجات واحتياجات'));
    });

    test('getCategoryById fetches single category', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/categories/cat_products')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'cat_products',
                'nameAr': 'منتجات واحتياجات',
                'nameEn': 'Products & Needs',
                'isActive': true,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiCategoryRepository(client: mockClient);
      final cat = await repo.getCategoryById('cat_products');

      expect(cat, isNotNull);
      expect(cat?.id, equals('cat_products'));
    });
  });
}

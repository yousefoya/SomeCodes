import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:al7btin_app/features/services/data/repositories/api_service_repository.dart';

void main() {
  group('ApiServiceRepository Tests', () {
    test('getServices fetches active services from PostgreSQL backend', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/services')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 'srv_gas_cylinder',
                  'categoryId': 'cat_products',
                  'nameAr': 'أسطوانة غاز منزلي 12.5 كغ',
                  'nameEn': 'Domestic Gas Cylinder 12.5kg',
                  'descriptionAr': 'توصيل أسطوانة غاز منزلية مع التركيب والفحص الآمن',
                  'descriptionEn': 'Domestic gas cylinder with safe check',
                  'type': 'delivery_product',
                  'basePrice': '7.00',
                  'unitAr': 'أسطوانة',
                  'unitEn': 'Cylinder',
                  'requiresQuotation': false,
                  'isActive': true,
                },
                {
                  'id': 'srv_pure_water',
                  'categoryId': 'cat_products',
                  'nameAr': 'قارورة مياه نقية 19 لتر',
                  'nameEn': 'Pure Mineral Water Bottle 19L',
                  'descriptionAr': 'مياه شرب نقية وصحية معقمة بأحدث التقنيات',
                  'descriptionEn': 'Pure mineral drinking water',
                  'type': 'delivery_product',
                  'basePrice': '1.50',
                  'unitAr': 'قارورة',
                  'unitEn': 'Bottle',
                  'requiresQuotation': false,
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

      final repo = ApiServiceRepository(client: mockClient);
      final services = await repo.getServices();

      expect(services.length, equals(2));
      expect(services[0].id, equals('srv_gas_cylinder'));
      expect(services[0].basePrice, equals(7.00));
      expect(services[0].isDeliveryProduct, isTrue);
      expect(services[1].basePrice, equals(1.50));
    });

    test('getServiceById retrieves specific service by id', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/services/srv_gas_cylinder')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'srv_gas_cylinder',
                'categoryId': 'cat_products',
                'nameAr': 'أسطوانة غاز منزلي 12.5 كغ',
                'nameEn': 'Domestic Gas Cylinder 12.5kg',
                'descriptionAr': 'توصيل أسطوانة غاز منزلية',
                'descriptionEn': 'Domestic gas cylinder',
                'type': 'delivery_product',
                'basePrice': '7.00',
                'unitAr': 'أسطوانة',
                'unitEn': 'Cylinder',
                'isActive': true,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiServiceRepository(client: mockClient);
      final s = await repo.getServiceById('srv_gas_cylinder');

      expect(s, isNotNull);
      expect(s?.id, equals('srv_gas_cylinder'));
      expect(s?.basePrice, equals(7.00));
    });
  });
}

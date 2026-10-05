import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:al7btin_app/features/providers/data/repositories/api_provider_repository.dart';

void main() {
  group('ApiProviderRepository Tests', () {
    test('getProviders fetches active providers and parse coverage areas from REST API', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/providers')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 'prov_gas_abdoun',
                  'nameAr': 'مركز توزيع غاز عبدون النموذجي',
                  'nameEn': 'Abdoun Model Gas Distribution Hub',
                  'phoneNumber': '0791234567',
                  'address': 'عمان - عبدون الشمالي',
                  'latitude': 31.9421,
                  'longitude': 35.8821,
                  'serviceCategoryIds': ['cat_products'],
                  'coverageAreas': ['عبدون', 'دير غبار', 'الصويفية'],
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

      final repo = ApiProviderRepository(client: mockClient);
      final providers = await repo.getProviders();

      expect(providers.length, equals(1));
      expect(providers[0].id, equals('prov_gas_abdoun'));
      expect(providers[0].nameAr, contains('عبدون'));
      expect(providers[0].deliveryCoverageAreas, contains('الصويفية'));
    });

    test('getMyProviderServices returns assigned services with availability status', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/provider/services')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 'srv_gas_12kg',
                  'nameAr': 'أسطوانة غاز منزلي 12.5 كغ',
                  'nameEn': 'LPG Cylinder 12.5kg',
                  'categoryId': 'cat_gas',
                  'basePrice': 10.0,
                  'unitAr': 'أسطوانة',
                  'unitEn': 'Cylinder',
                  'icon': 'local_fire_department_rounded',
                  'isAvailable': true,
                },
                {
                  'id': 'srv_gas_50kg',
                  'nameAr': 'أسطوانة غاز تجاري 50 كغ',
                  'nameEn': 'Commercial LPG Cylinder 50kg',
                  'categoryId': 'cat_gas',
                  'basePrice': 40.0,
                  'unitAr': 'أسطوانة',
                  'unitEn': 'Cylinder',
                  'icon': 'local_fire_department_rounded',
                  'isAvailable': false,
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiProviderRepository(client: mockClient);
      final services = await repo.getMyProviderServices();

      expect(services.length, equals(2));
      expect(services[0]['id'], equals('srv_gas_12kg'));
      expect(services[0]['isAvailable'], isTrue);
      expect(services[1]['id'], equals('srv_gas_50kg'));
      expect(services[1]['isAvailable'], isFalse);
    });

    test('updateServiceAvailability sends PATCH request with isAvailable flag', () async {
      bool patchCalled = false;
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/provider/services/srv_gas_12kg/availability') && request.method == 'PATCH') {
          patchCalled = true;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['isAvailable'], isFalse);

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'serviceId': 'srv_gas_12kg',
                'isAvailable': false,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiProviderRepository(client: mockClient);
      await repo.updateServiceAvailability('srv_gas_12kg', false);

      expect(patchCalled, isTrue);
    });

    test('acceptOrder calls /provider/orders/:id/accept PATCH endpoint', () async {
      bool acceptCalled = false;
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/provider/orders/order_test_123/accept') && request.method == 'PATCH') {
          acceptCalled = true;
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'order_test_123',
                'status': 'accepted',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiProviderRepository(client: mockClient);
      final result = await repo.acceptOrder('order_test_123');

      expect(acceptCalled, isTrue);
      expect(result, isTrue);
    });

    test('rejectOrder calls /provider/orders/:id/reject PATCH endpoint with notes', () async {
      bool rejectCalled = false;
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/provider/orders/order_test_123/reject') && request.method == 'PATCH') {
          rejectCalled = true;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['notes'], equals('خارج أوقات العمل'));

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'order_test_123',
                'status': 'rejected',
                'rejectionReason': 'خارج أوقات العمل',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiProviderRepository(client: mockClient);
      final result = await repo.rejectOrder('order_test_123', notes: 'خارج أوقات العمل');

      expect(rejectCalled, isTrue);
      expect(result, isTrue);
    });

    test('updateOrderStatus calls /provider/orders/:id/status PATCH endpoint', () async {
      bool statusCalled = false;
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/provider/orders/order_test_123/status') && request.method == 'PATCH') {
          statusCalled = true;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['status'], equals('completed'));

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'order_test_123',
                'status': 'completed',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiProviderRepository(client: mockClient);
      final result = await repo.updateOrderStatus('order_test_123', 'completed');

      expect(statusCalled, isTrue);
      expect(result, isTrue);
    });
  });
}

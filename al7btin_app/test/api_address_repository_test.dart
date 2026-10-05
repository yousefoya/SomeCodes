import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/address/data/repositories/api_address_repository.dart';

void main() {
  group('ApiAddressRepository Tests', () {
    test('getAddresses fetches user addresses from REST API', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/addresses')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 'addr_1',
                  'title': 'المنزل',
                  'city': 'عمان',
                  'area': 'عبدون',
                  'streetAddress': 'شارع دمشق',
                  'latitude': 31.9539,
                  'longitude': 35.9106,
                  'isDefault': true,
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiAddressRepository(client: mockClient);
      final addresses = await repo.getAddresses();

      expect(addresses.length, equals(1));
      expect(addresses.first.id, equals('addr_1'));
      expect(addresses.first.area, equals('عبدون'));
      expect(addresses.first.isDefault, isTrue);
    });

    test('addAddress posts address and returns created entity', () async {
      bool postCalled = false;
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/addresses') && request.method == 'POST') {
          postCalled = true;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['area'], equals('خلدا'));

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'addr_2',
                'title': 'العمل',
                'city': 'عمان',
                'area': 'خلدا',
                'streetAddress': 'شارع وصفي التل',
                'latitude': 31.9892,
                'longitude': 35.8456,
                'isDefault': false,
              },
            }),
            201,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final repo = ApiAddressRepository(client: mockClient);
      const newAddr = UserAddress(
        id: '',
        title: 'العمل',
        area: 'خلدا',
        streetAddress: 'شارع وصفي التل',
        location: GeoPoint(latitude: 31.9892, longitude: 35.8456),
      );

      final result = await repo.addAddress(newAddr);
      expect(postCalled, isTrue);
      expect(result.id, equals('addr_2'));
      expect(result.area, equals('خلدا'));
    });
  });
}

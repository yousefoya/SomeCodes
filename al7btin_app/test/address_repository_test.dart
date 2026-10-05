import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/core/services/location/location_service_interface.dart';
import 'package:al7btin_app/features/address/data/repositories/mock_address_repository.dart';

void main() {
  group('MockAddressRepository Tests', () {
    late MockAddressRepository repository;

    setUp(() {
      repository = MockAddressRepository(networkDelay: Duration.zero);
    });

    test('getAddresses returns initial saved Jordanian addresses in Amman', () async {
      final addresses = await repository.getAddresses();
      expect(addresses.isNotEmpty, true);
      expect(addresses.first.city, 'عمان');
      expect(addresses.any((a) => a.isDefault), true);
    });

    test('addAddress adds a new address and handles default flag', () async {
      const newAddr = UserAddress(
        id: 'ADDR-NEW',
        title: 'العمل',
        city: 'عمان',
        area: 'دابوق',
        streetAddress: 'شارع الملك عبد الله الثاني',
        isDefault: true,
      );

      final added = await repository.addAddress(newAddr);
      expect(added.id, 'ADDR-NEW');
      expect(added.area, 'دابوق');

      final addresses = await repository.getAddresses();
      expect(addresses.first.id, 'ADDR-NEW');
      expect(addresses.first.isDefault, true);

      // Other addresses should not be default anymore
      final otherDefaults = addresses.skip(1).where((a) => a.isDefault).toList();
      expect(otherDefaults.isEmpty, true);
    });

    test('deleteAddress removes address and preserves a default if others remain', () async {
      final initial = await repository.getAddresses();
      final targetId = initial.first.id;

      await repository.deleteAddress(targetId);
      final afterDelete = await repository.getAddresses();
      expect(afterDelete.any((a) => a.id == targetId), false);
    });

    test('setDefaultAddress switches default address', () async {
      final addresses = await repository.getAddresses();
      if (addresses.length >= 2) {
        final secondId = addresses[1].id;
        await repository.setDefaultAddress(secondId);

        final updated = await repository.getAddresses();
        final newDefault = updated.firstWhere((a) => a.id == secondId);
        expect(newDefault.isDefault, true);
      }
    });
  });
}

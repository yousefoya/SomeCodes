import 'dart:async';
import '../../../../core/services/location/location_service_interface.dart';
import '../../domain/repositories/address_repository_interface.dart';

/// Mock in-memory implementation of IAddressRepository
class MockAddressRepository implements IAddressRepository {
  final Duration networkDelay;

  MockAddressRepository({
    this.networkDelay = const Duration(milliseconds: 250),
  });

  final List<UserAddress> _mockAddresses = [
    const UserAddress(
      id: 'ADDR-001',
      title: 'المنزل',
      city: 'عمان',
      area: 'عبدون الشمالي',
      streetAddress: 'شارع دمشق، بالقرب من السفارة الأمريكية',
      buildingNumber: '14',
      floor: '2',
      apartmentNumber: '4',
      deliveryInstructions: 'يرجى الاتصال عند الوصول وترك الطلب عند الباب',
      location: GeoPoint(latitude: 31.9421, longitude: 35.8872),
      isDefault: true,
    ),
    const UserAddress(
      id: 'ADDR-002',
      title: 'العمل / المكتب',
      city: 'عمان',
      area: 'الشميساني',
      streetAddress: 'شارع عبد الحميد شرف، مجمع البنوك',
      buildingNumber: '28',
      floor: '5',
      apartmentNumber: '502',
      deliveryInstructions: 'الاستلام عند مكتب الاستقبال الرئيسي',
      location: GeoPoint(latitude: 31.9688, longitude: 35.9012),
      isDefault: false,
    ),
  ];

  @override
  Future<List<UserAddress>> getAddresses() async {
    await Future<void>.delayed(networkDelay);
    return List.from(_mockAddresses);
  }

  @override
  Future<UserAddress?> getAddressById(String id) async {
    await Future<void>.delayed(networkDelay);
    try {
      return _mockAddresses.firstWhere((a) => a.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<UserAddress> addAddress(UserAddress address) async {
    await Future<void>.delayed(networkDelay);
    final newAddress = address.id.isEmpty
        ? address.copyWith(id: 'ADDR-${DateTime.now().millisecondsSinceEpoch}')
        : address;

    if (newAddress.isDefault) {
      for (int i = 0; i < _mockAddresses.length; i++) {
        _mockAddresses[i] = _mockAddresses[i].copyWith(isDefault: false);
      }
    }

    _mockAddresses.insert(0, newAddress);
    return newAddress;
  }

  @override
  Future<UserAddress> updateAddress(UserAddress address) async {
    await Future<void>.delayed(networkDelay);
    final index = _mockAddresses.indexWhere((a) => a.id == address.id);
    if (index != -1) {
      if (address.isDefault) {
        for (int i = 0; i < _mockAddresses.length; i++) {
          _mockAddresses[i] = _mockAddresses[i].copyWith(isDefault: false);
        }
      }
      _mockAddresses[index] = address;
      return address;
    }
    return address;
  }

  @override
  Future<void> deleteAddress(String id) async {
    await Future<void>.delayed(networkDelay);
    _mockAddresses.removeWhere((a) => a.id == id);
    if (_mockAddresses.isNotEmpty && !_mockAddresses.any((a) => a.isDefault)) {
      _mockAddresses[0] = _mockAddresses[0].copyWith(isDefault: true);
    }
  }

  @override
  Future<void> setDefaultAddress(String id) async {
    await Future<void>.delayed(networkDelay);
    for (int i = 0; i < _mockAddresses.length; i++) {
      _mockAddresses[i] = _mockAddresses[i].copyWith(
        isDefault: _mockAddresses[i].id == id,
      );
    }
  }
}

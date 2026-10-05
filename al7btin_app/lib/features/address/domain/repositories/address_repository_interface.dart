import '../../../../core/services/location/location_service_interface.dart';

/// Abstract contract for User Address management
abstract class IAddressRepository {
  Future<List<UserAddress>> getAddresses();
  Future<UserAddress?> getAddressById(String id);
  Future<UserAddress> addAddress(UserAddress address);
  Future<UserAddress> updateAddress(UserAddress address);
  Future<void> deleteAddress(String id);
  Future<void> setDefaultAddress(String id);
}

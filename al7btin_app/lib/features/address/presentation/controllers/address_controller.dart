import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/location/location_service_interface.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/repositories/api_address_repository.dart';
import '../../domain/repositories/address_repository_interface.dart';

/// Provider for IAddressRepository (connected to real backend)
final addressRepositoryProvider = Provider<IAddressRepository>((ref) {
  final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiAddressRepository(authLocalDataSource: authLocalDataSource);
});

/// State notifier managing addresses list
class AddressNotifier extends StateNotifier<AsyncValue<List<UserAddress>>> {
  final IAddressRepository _repository;

  AddressNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadAddresses();
  }

  Future<void> loadAddresses() async {
    state = const AsyncValue.loading();
    try {
      final list = await _repository.getAddresses();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<UserAddress> addAddress(UserAddress address) async {
    final newAddress = await _repository.addAddress(address);
    await loadAddresses();
    return newAddress;
  }

  Future<UserAddress> updateAddress(UserAddress address) async {
    final updated = await _repository.updateAddress(address);
    await loadAddresses();
    return updated;
  }

  Future<void> deleteAddress(String id) async {
    await _repository.deleteAddress(id);
    await loadAddresses();
  }

  Future<void> setDefaultAddress(String id) async {
    await _repository.setDefaultAddress(id);
    await loadAddresses();
  }
}

/// Provider for AddressNotifier
final addressNotifierProvider = StateNotifierProvider<AddressNotifier, AsyncValue<List<UserAddress>>>((ref) {
  final repository = ref.watch(addressRepositoryProvider);
  return AddressNotifier(repository);
});

/// Provider for currently selected active delivery address
final selectedDeliveryAddressProvider = StateProvider<UserAddress?>((ref) {
  final addressesAsync = ref.watch(addressNotifierProvider);
  return addressesAsync.maybeWhen(
    data: (addresses) {
      if (addresses.isEmpty) return null;
      return addresses.firstWhere(
        (a) => a.isDefault,
        orElse: () => addresses.first,
      );
    },
    orElse: () => null,
  );
});

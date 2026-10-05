import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/repositories/api_provider_repository.dart';
import '../../domain/entities/provider_entity.dart';
import '../../domain/repositories/provider_repository_interface.dart';

/// Provider for IProviderRepository interface (connected to real backend)
final providerRepositoryProvider = Provider<IProviderRepository>((ref) {
  final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiProviderRepository(authLocalDataSource: authLocalDataSource);
});

/// StateNotifier managing Provider shops in Admin Dashboard and order dispatch
class ProvidersController extends StateNotifier<List<ProviderEntity>> {
  final IProviderRepository _repository;

  ProvidersController(this._repository) : super(const []) {
    loadProviders();
  }

  Future<void> loadProviders() async {
    try {
      final list = await _repository.getProviders(includeInactive: true);
      state = list;
    } catch (e) {
      // Keep current state on network error
    }
  }

  Future<ProviderEntity?> getProviderForService(String serviceCategoryId) async {
    return _repository.getProviderForService(serviceCategoryId);
  }

  Future<ProviderEntity> addProvider({
    required String nameAr,
    required String nameEn,
    String descriptionAr = '',
    String descriptionEn = '',
    String logo = '',
    double rating = 5.0,
    required String phoneNumber,
    required String address,
    required double latitude,
    required double longitude,
    required List<String> serviceIds,
    List<String> serviceCategories = const ['cat_products'],
    String operatingHours = '08:00 AM - 10:00 PM',
    bool isAvailable = true,
  }) async {
    final newProv = ProviderEntity(
      id: 'prov_${DateTime.now().millisecondsSinceEpoch}',
      nameAr: nameAr,
      nameEn: nameEn,
      descriptionAr: descriptionAr,
      descriptionEn: descriptionEn,
      logo: logo,
      rating: rating,
      phoneNumber: phoneNumber,
      address: address,
      latitude: latitude,
      longitude: longitude,
      serviceIds: serviceIds,
      availableServiceIds: serviceIds,
      serviceCategories: serviceCategories,
      operatingHours: operatingHours,
      isActive: true,
      isAvailable: isAvailable,
      createdAt: DateTime.now(),
    );

    final saved = await _repository.addProvider(newProv);
    state = [saved, ...state.where((p) => p.id != saved.id)];
    return saved;
  }

  Future<void> updateProvider(ProviderEntity provider) async {
    final updated = await _repository.updateProvider(provider);
    state = state.map((p) => p.id == updated.id ? updated : p).toList();
  }

  Future<void> toggleProviderStatus(String id) async {
    final prov = state.firstWhere((p) => p.id == id);
    final updated = prov.copyWith(isActive: !prov.isActive);
    await _repository.updateProvider(updated);
    state = state.map((p) => p.id == id ? updated : p).toList();
  }

  Future<void> deleteProvider(String id) async {
    await _repository.deleteProvider(id);
    state = state.where((p) => p.id != id).toList();
  }
}

/// Global provider for ProvidersController
final providersControllerProvider = StateNotifierProvider<ProvidersController, List<ProviderEntity>>((ref) {
  final repo = ref.watch(providerRepositoryProvider);
  return ProvidersController(repo);
});

/// Family provider to fetch providers offering a specific service (Customer discovery)
final providersForServiceProvider = FutureProvider.family<List<ProviderEntity>, String>((ref, serviceId) async {
  final repo = ref.watch(providerRepositoryProvider);
  return repo.getProvidersForService(serviceId);
});

/// Family provider to fetch a single provider's full details (Customer Provider Details screen)
final providerDetailsProvider = FutureProvider.family<ProviderEntity?, String>((ref, providerId) async {
  final repo = ref.watch(providerRepositoryProvider);
  return repo.getProviderById(providerId);
});

/// Provider for loading the current authenticated provider shop profile
final myProviderProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final repo = ref.watch(providerRepositoryProvider);
  return repo.getMyProviderProfile();
});

/// Provider for loading assigned services for the logged-in provider
final myProviderServicesProvider =
    StateNotifierProvider<MyProviderServicesController, AsyncValue<List<Map<String, dynamic>>>>((ref) {
  final repo = ref.watch(providerRepositoryProvider);
  return MyProviderServicesController(repo);
});

/// StateNotifier for logged-in Provider's products/services & availability toggles
class MyProviderServicesController extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  final IProviderRepository _repository;

  MyProviderServicesController(this._repository) : super(const AsyncValue.loading()) {
    loadServices();
  }

  Future<void> loadServices() async {
    state = const AsyncValue.loading();
    try {
      final services = await _repository.getMyProviderServices();
      state = AsyncValue.data(services);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> toggleAvailability(String serviceId, bool isAvailable) async {
    try {
      await _repository.updateServiceAvailability(serviceId, isAvailable);
      state.whenData((currentList) {
        final updated = currentList.map((item) {
          if (item['id'] == serviceId) {
            return {...item, 'isAvailable': isAvailable};
          }
          return item;
        }).toList();
        state = AsyncValue.data(updated);
      });
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

/// Provider for managing incoming and historical orders for the logged-in provider
final myProviderOrdersProvider =
    StateNotifierProvider<MyProviderOrdersController, AsyncValue<List<Map<String, dynamic>>>>((ref) {
  final repo = ref.watch(providerRepositoryProvider);
  return MyProviderOrdersController(repo);
});

/// StateNotifier for logged-in Provider's incoming orders with Accept / Reject / Status Actions
class MyProviderOrdersController extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  final IProviderRepository _repository;

  MyProviderOrdersController(this._repository) : super(const AsyncValue.loading()) {
    loadOrders();
  }

  Future<void> loadOrders() async {
    state = const AsyncValue.loading();
    try {
      final orders = await _repository.getMyProviderOrders();
      state = AsyncValue.data(orders);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> acceptOrder(String orderId) async {
    try {
      await _repository.acceptOrder(orderId);
      state.whenData((list) {
        final updated = list.map((o) {
          if (o['id'] == orderId) {
            return {
              ...o,
              'status': 'accepted',
              'updatedAt': DateTime.now().toIso8601String(),
            };
          }
          return o;
        }).toList();
        state = AsyncValue.data(updated);
      });
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> rejectOrder(String orderId, {String? notes}) async {
    try {
      await _repository.rejectOrder(orderId, notes: notes);
      state.whenData((list) {
        final updated = list.map((o) {
          if (o['id'] == orderId) {
            return {
              ...o,
              'status': 'rejected',
              'updatedAt': DateTime.now().toIso8601String(),
            };
          }
          return o;
        }).toList();
        state = AsyncValue.data(updated);
      });
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> updateOrderStatus(String orderId, String newStatus, {String? notes}) async {
    try {
      await _repository.updateOrderStatus(orderId, newStatus, notes: notes);
      state.whenData((list) {
        final updated = list.map((o) {
          if (o['id'] == orderId) {
            return {
              ...o,
              'status': newStatus,
              'updatedAt': DateTime.now().toIso8601String(),
            };
          }
          return o;
        }).toList();
        state = AsyncValue.data(updated);
      });
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

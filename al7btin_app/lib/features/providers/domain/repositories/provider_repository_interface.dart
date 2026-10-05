import '../entities/provider_entity.dart';

/// Abstract contract for Provider / Distribution Center operations
abstract class IProviderRepository {
  /// Fetch all providers or filtered by service category / serviceId
  Future<List<ProviderEntity>> getProviders({String? serviceCategoryId, String? serviceId, bool includeInactive = false});

  /// Fetch a single provider by unique ID with full joined services and options
  Future<ProviderEntity?> getProviderById(String id);

  /// Find the best matching provider for a service category
  Future<ProviderEntity?> getProviderForService(String serviceCategoryId);

  /// Fetch providers offering a specific service
  Future<List<ProviderEntity>> getProvidersForService(String serviceId);

  /// Create a new provider (Admin)
  Future<ProviderEntity> addProvider(ProviderEntity provider);

  /// Update an existing provider (Admin)
  Future<ProviderEntity> updateProvider(ProviderEntity provider);

  /// Toggle or delete provider
  Future<void> deleteProvider(String id);

  /// Fetch authenticated provider's shop details, services, stats, and staff
  Future<Map<String, dynamic>?> getMyProviderProfile();

  /// Provider toggles their general Online / Offline availability status
  Future<bool> updateMyProviderStatus(bool isAvailable);

  /// Provider edits permitted profile information
  Future<bool> updateMyProviderProfile(Map<String, dynamic> data);

  /// Provider fetches orders assigned to their facility
  Future<List<Map<String, dynamic>>> getMyProviderOrders();

  /// Provider accepts an incoming order
  Future<bool> acceptOrder(String orderId, {String? notes});

  /// Provider rejects an incoming order
  Future<bool> rejectOrder(String orderId, {String? notes});

  /// Provider updates lifecycle status of an assigned order
  Future<bool> updateOrderStatus(String orderId, String status, {String? notes});

  /// Fetch products/services assigned to the authenticated provider with current availability
  Future<List<Map<String, dynamic>>> getMyProviderServices();

  /// Toggle current availability of a product/service for the authenticated provider
  Future<bool> updateServiceAvailability(String serviceId, bool isAvailable);
}

import '../entities/service_entity.dart';
import '../entities/dynamic_service_config_entity.dart';

/// Abstract contract for Service operations
abstract class IServiceRepository {
  /// Fetch all active services or filtered by categoryId
  Future<List<ServiceEntity>> getServices({String? categoryId, bool includeInactive = false});

  /// Fetch a single service by its unique identifier
  Future<ServiceEntity?> getServiceById(String id);

  /// Search services by keyword
  Future<List<ServiceEntity>> searchServices(String query);

  /// Add a new service / product (Admin)
  Future<ServiceEntity> addService(ServiceEntity service);

  /// Update an existing service / product (Admin)
  Future<ServiceEntity> updateService(ServiceEntity service);

  /// Delete or deactivate a service (Admin)
  Future<void> deleteService(String serviceId);

  /// Add a new variant / option to a service (Admin)
  Future<ServiceOptionEntity> addServiceOption(String serviceId, ServiceOptionEntity option);

  /// Update an existing variant / option (Admin)
  Future<ServiceOptionEntity> updateServiceOption(ServiceOptionEntity option);

  /// Delete a variant / option (Admin)
  Future<void> deleteServiceOption(String optionId);

  /// Fetch full dynamic configuration (fields, rules, pricing rules, options)
  Future<DynamicServiceConfigEntity> getServiceConfiguration(String id);

  /// Calculate authoritative price from the server based on customer answers
  Future<DynamicPriceQuoteEntity> calculateDynamicPrice(
    String id,
    Map<String, dynamic> answers, {
    String? optionId,
    int quantity = 1,
    String? couponCode,
  });
}

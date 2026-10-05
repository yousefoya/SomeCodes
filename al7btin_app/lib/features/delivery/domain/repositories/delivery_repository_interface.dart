import '../entities/delivery_employee_entity.dart';

/// Interface for Delivery Employees Repository
abstract class IDeliveryRepository {
  /// Fetches all delivery employees from backend
  Future<List<DeliveryEmployeeEntity>> getDeliveryEmployees();

  /// Adds a new delivery employee assigned to a specific provider
  Future<DeliveryEmployeeEntity> addDeliveryEmployee({
    required String name,
    required String phoneNumber,
    required String vehicleType,
    required String vehiclePlateNumber,
    required String providerId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  });

  /// Updates existing delivery employee details
  Future<DeliveryEmployeeEntity> updateDeliveryEmployee(DeliveryEmployeeEntity employee);

  /// Toggles active/suspended status of delivery employee
  Future<void> toggleEmployeeStatus(String id, bool currentStatus);

  /// Updates delivery capabilities
  Future<void> updateDeliveryCapabilities({
    required String driverId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  });

  /// Deletes a delivery employee
  Future<void> deleteDeliveryEmployee(String id);
}

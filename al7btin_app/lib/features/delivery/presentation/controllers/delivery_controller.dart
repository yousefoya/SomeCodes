import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/repositories/api_delivery_repository.dart';
import '../../domain/entities/delivery_employee_entity.dart';
import '../../domain/repositories/delivery_repository_interface.dart';

/// Provider for IDeliveryRepository interface (connected to real backend)
final deliveryRepositoryProvider = Provider<IDeliveryRepository>((ref) {
  final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiDeliveryRepository(authLocalDataSource: authLocalDataSource);
});

/// StateNotifier managing delivery drivers and partner accounts with provider association and service capabilities
class DeliveryEmployeesController extends StateNotifier<List<DeliveryEmployeeEntity>> {
  final IDeliveryRepository _repository;

  DeliveryEmployeesController(this._repository) : super(const []) {
    loadDeliveryEmployees();
  }

  /// Fetches all delivery employees from real backend
  Future<void> loadDeliveryEmployees() async {
    try {
      final list = await _repository.getDeliveryEmployees();
      state = list;
    } catch (e) {
      // Keep state on network / test environment error
    }
  }

  /// Adds a new delivery employee account assigned to a specific provider
  Future<DeliveryEmployeeEntity> addDeliveryEmployee({
    required String name,
    required String phoneNumber,
    required String vehicleType,
    required String vehiclePlateNumber,
    required String providerId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  }) async {
    final driver = await _repository.addDeliveryEmployee(
      name: name,
      phoneNumber: phoneNumber,
      vehicleType: vehicleType,
      vehiclePlateNumber: vehiclePlateNumber,
      providerId: providerId,
      serviceIds: serviceIds,
      categoryIds: categoryIds,
    );

    state = [driver, ...state.where((d) => d.id != driver.id)];
    return driver;
  }

  /// Updates existing driver details
  Future<void> updateDeliveryEmployee(DeliveryEmployeeEntity employee) async {
    final updated = await _repository.updateDeliveryEmployee(employee);
    state = state.map((e) => e.id == updated.id ? updated : e).toList();
  }

  /// Toggles active status of delivery employee (Admin action)
  Future<void> toggleEmployeeStatus(String employeeId) async {
    final drv = state.firstWhere((e) => e.id == employeeId);
    await _repository.toggleEmployeeStatus(employeeId, drv.isActive);
    state = state.map((e) {
      if (e.id == employeeId) {
        return e.copyWith(isActive: !e.isActive);
      }
      return e;
    }).toList();
  }

  /// Updates driver capabilities in backend
  Future<void> updateDeliveryCapabilities({
    required String driverId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  }) async {
    await _repository.updateDeliveryCapabilities(
      driverId: driverId,
      serviceIds: serviceIds,
      categoryIds: categoryIds,
    );
    state = state.map((e) {
      if (e.id == driverId) {
        return e.copyWith(
          serviceCapabilities: serviceIds,
          assignedServiceCategories: categoryIds,
        );
      }
      return e;
    }).toList();
  }

  /// Toggles online / offline availability (Driver action)
  void toggleOnlineStatus(String employeeId) {
    state = state.map((e) {
      if (e.id == employeeId) {
        return e.copyWith(isOnline: !e.isOnline);
      }
      return e;
    }).toList();
  }

  /// Updates driver location coordinates
  void updateDriverLocation(String employeeId, double lat, double lng) {
    state = state.map((e) {
      if (e.id == employeeId) {
        return e.copyWith(latitude: lat, longitude: lng);
      }
      return e;
    }).toList();
  }

  /// Updates driver orders count
  void incrementActiveOrders(String employeeId) {
    state = state.map((e) {
      if (e.id == employeeId) {
        return e.copyWith(activeOrdersCount: e.activeOrdersCount + 1);
      }
      return e;
    }).toList();
  }

  void completeOrderForDriver(String employeeId) {
    state = state.map((e) {
      if (e.id == employeeId) {
        final newActive = e.activeOrdersCount > 0 ? e.activeOrdersCount - 1 : 0;
        return e.copyWith(
          activeOrdersCount: newActive,
          completedOrdersCount: e.completedOrdersCount + 1,
        );
      }
      return e;
    }).toList();
  }
}

/// Global provider for delivery employees
final deliveryEmployeesControllerProvider =
    StateNotifierProvider<DeliveryEmployeesController, List<DeliveryEmployeeEntity>>((ref) {
  final repo = ref.watch(deliveryRepositoryProvider);
  return DeliveryEmployeesController(repo);
});

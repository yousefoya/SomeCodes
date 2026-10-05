import '../../domain/entities/delivery_employee_entity.dart';
import '../../domain/repositories/delivery_repository_interface.dart';

/// Mock implementation of IDeliveryRepository for isolated unit & widget testing
class MockDeliveryRepository implements IDeliveryRepository {
  final List<DeliveryEmployeeEntity> _drivers;

  MockDeliveryRepository([List<DeliveryEmployeeEntity>? initialDrivers])
      : _drivers = initialDrivers ??
            [
              DeliveryEmployeeEntity(
                id: 'DRV-101',
                name: 'أحمد الخلايلة (Ahmad)',
                phoneNumber: '0798881122',
                vehicleType: 'بيك آب غاز مجهز',
                vehiclePlateNumber: '32-49102',
                providerId: 'prov_gas_hub_amman',
                providerName: 'وكالة غاز الأردن المركزية - خلدا',
                serviceCapabilities: const ['srv_gas_cylinder', 'srv_gas', 'srv_pure_water', 'srv_heating_diesel'],
                assignedServiceCategories: const ['cat_products'],
                latitude: 31.9850,
                longitude: 35.8500,
                isActive: true,
                isOnline: true,
                activeOrdersCount: 0,
                completedOrdersCount: 38,
                rating: 4.9,
                createdAt: DateTime.now().subtract(const Duration(days: 45)),
              ),
              DeliveryEmployeeEntity(
                id: 'DRV-102',
                name: 'طارق الزعبي (Tareq)',
                phoneNumber: '0785553344',
                vehicleType: 'شاحنة توزيع',
                vehiclePlateNumber: '11-88301',
                providerId: 'prov_gas_hub_amman',
                providerName: 'وكالة غاز الأردن المركزية - خلدا',
                serviceCapabilities: const ['srv_gas_cylinder', 'srv_gas', 'srv_pure_water', 'srv_heating_diesel', 'srv_electrical'],
                assignedServiceCategories: const ['cat_products', 'cat_home_services'],
                latitude: 31.9950,
                longitude: 35.9500,
                isActive: true,
                isOnline: true,
                activeOrdersCount: 0,
                completedOrdersCount: 74,
                rating: 5.0,
                createdAt: DateTime.now().subtract(const Duration(days: 90)),
              ),
              DeliveryEmployeeEntity(
                id: 'DRV-103',
                name: 'محمد العبادي (Mohammad)',
                phoneNumber: '0771114455',
                vehicleType: 'فان صيانة فنية',
                vehiclePlateNumber: '44-20918',
                providerId: 'prov_home_maintenance_hub',
                providerName: 'مركز الدعم الفني والصيانة المعتمد - الشميساني',
                serviceCapabilities: const ['srv_plumbing', 'srv_electrical', 'srv_ac_cooling'],
                assignedServiceCategories: const ['cat_home_services'],
                latitude: 31.9700,
                longitude: 35.8900,
                isActive: true,
                isOnline: true,
                activeOrdersCount: 0,
                completedOrdersCount: 52,
                rating: 4.8,
                createdAt: DateTime.now().subtract(const Duration(days: 60)),
              ),
            ];

  @override
  Future<List<DeliveryEmployeeEntity>> getDeliveryEmployees() async {
    return List.unmodifiable(_drivers);
  }

  @override
  Future<DeliveryEmployeeEntity> addDeliveryEmployee({
    required String name,
    required String phoneNumber,
    required String vehicleType,
    required String vehiclePlateNumber,
    required String providerId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  }) async {
    final driver = DeliveryEmployeeEntity(
      id: 'DRV-${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      phoneNumber: phoneNumber,
      vehicleType: vehicleType,
      vehiclePlateNumber: vehiclePlateNumber,
      providerId: providerId,
      serviceCapabilities: serviceIds,
      assignedServiceCategories: categoryIds,
      isActive: true,
      isOnline: false,
      createdAt: DateTime.now(),
    );
    _drivers.add(driver);
    return driver;
  }

  @override
  Future<DeliveryEmployeeEntity> updateDeliveryEmployee(DeliveryEmployeeEntity employee) async {
    final index = _drivers.indexWhere((d) => d.id == employee.id);
    if (index != -1) {
      _drivers[index] = employee;
      return employee;
    }
    _drivers.add(employee);
    return employee;
  }

  @override
  Future<void> toggleEmployeeStatus(String id, bool currentStatus) async {
    final index = _drivers.indexWhere((d) => d.id == id);
    if (index != -1) {
      _drivers[index] = _drivers[index].copyWith(isActive: !currentStatus);
    }
  }

  @override
  Future<void> updateDeliveryCapabilities({
    required String driverId,
    required List<String> serviceIds,
    List<String> categoryIds = const ['cat_products'],
  }) async {
    final index = _drivers.indexWhere((d) => d.id == driverId);
    if (index != -1) {
      _drivers[index] = _drivers[index].copyWith(
        serviceCapabilities: serviceIds,
        assignedServiceCategories: categoryIds,
      );
    }
  }

  @override
  Future<void> deleteDeliveryEmployee(String id) async {
    _drivers.removeWhere((d) => d.id == id);
  }
}

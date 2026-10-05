import 'dart:async';
import '../../domain/entities/provider_entity.dart';
import '../../domain/repositories/provider_repository_interface.dart';

/// In-memory repository implementing IProviderRepository with baseline distribution facilities in Amman
class MockProviderRepository implements IProviderRepository {
  final Duration networkDelay;

  MockProviderRepository({
    this.networkDelay = Duration.zero,
  });

  static final List<ProviderEntity> defaultProviders = [
    ProviderEntity(
      id: 'prov_gas_hub_amman',
      nameAr: 'وكالة غاز الأردن المركزية - خلدا',
      nameEn: 'Jordan Central Gas Agency - Khalda',
      descriptionAr: 'الموزع المعتمد لأسطوانات الغاز وصمامات الأمان في عمان الغربية مع الفحص الفوري عند التوصيل.',
      descriptionEn: 'Certified distributor for gas cylinders and safety regulators in West Amman with on-site inspection.',
      logo: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200',
      phoneNumber: '0795551122',
      address: 'عمان - خلدا - شارع وصفي التل',
      latitude: 31.9892,
      longitude: 35.8456,
      serviceIds: const ['srv_gas_cylinder'],
      availableServiceIds: const ['srv_gas_cylinder'],
      serviceCategories: const ['cat_products'],
      isActive: true,
      isAvailable: true,
      rating: 4.9,
      operatingHours: '07:00 AM - 11:00 PM',
      deliveryCoverageAreas: const ['خلدا', 'تلاع العلي', 'دابوق', 'الشميساني', 'الجبيهة'],
      assignedDriverIds: const ['DRV-101', 'DRV-102'],
      createdAt: DateTime(2026, 1, 1),
    ),
    ProviderEntity(
      id: 'prov_water_plant_amman',
      nameAr: 'محطة ومستودع مياه الشرب النقية والصهاريج - الجبيهة',
      nameEn: 'Pure Water & Tankers Distribution Hub - Jubaiha',
      descriptionAr: 'محطة تعبئة وتوزيع مياه الشرب المعقمة والمعدنية وقوارير 19 لتر وصهاريج المياه لجميع أنحاء عمان.',
      descriptionEn: 'Purified water bottling and delivery plant, 19L gallons, and tanker trucks for all Amman regions.',
      logo: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=200',
      phoneNumber: '0786663344',
      address: 'عمان - الجبيهة - قرب دوار المنهل',
      latitude: 32.0234,
      longitude: 35.8643,
      serviceIds: const ['srv_water', 'srv_water_tank'],
      availableServiceIds: const ['srv_water', 'srv_water_tank'],
      serviceCategories: const ['cat_products'],
      isActive: true,
      isAvailable: true,
      rating: 4.8,
      operatingHours: '08:00 AM - 10:00 PM',
      deliveryCoverageAreas: const ['الجبيهة', 'شفا بدران', 'أبو نصير', 'صويلح'],
      assignedDriverIds: const ['DRV-101', 'DRV-102'],
      createdAt: DateTime(2026, 1, 1),
    ),
    ProviderEntity(
      id: 'prov_diesel_terminal',
      nameAr: 'محطة تزويد الديزل والشحن الكهربائي - طبربور',
      nameEn: 'Diesel Fuel Terminal & Mobile EV Rescue - Tabarbour',
      descriptionAr: 'توزيع محروقات الديزل للتدفئة بعدادات إلكترونية معتمدة، بالإضافة لخدمات شحن الطوارئ للسيارات الكهربائية.',
      descriptionEn: 'Heating diesel distribution with calibrated digital meters plus mobile EV emergency rescue charge.',
      logo: 'https://images.unsplash.com/photo-1527018606446-03f21be55ad7?w=200',
      phoneNumber: '0777778899',
      address: 'عمان - طبربور - شارع الأردن',
      latitude: 31.9961,
      longitude: 35.9521,
      serviceIds: const ['srv_diesel', 'srv_ev_charging'],
      availableServiceIds: const ['srv_diesel', 'srv_ev_charging'],
      serviceCategories: const ['cat_products'],
      isActive: true,
      isAvailable: true,
      rating: 4.9,
      operatingHours: '06:00 AM - 10:00 PM',
      deliveryCoverageAreas: const ['طبربور', 'ماركا', 'الهاشمي', 'عمان الشرقية'],
      assignedDriverIds: const ['DRV-102'],
      createdAt: DateTime(2026, 1, 1),
    ),
    ProviderEntity(
      id: 'prov_home_maintenance_hub',
      nameAr: 'مركز الدعم الفني والصيانة المعتمد - الشميساني',
      nameEn: 'Technical Home Maintenance Center - Shmeisani',
      descriptionAr: 'فريق فني متخصص في خدمات صيانة الكهرباء، السباكة، والتكييف والتبريد للمنازل والمنشآت على مدار الساعة.',
      descriptionEn: 'Specialized technician team for electrical, plumbing, AC, and cooling maintenance for residential and commercial units.',
      logo: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200',
      phoneNumber: '065000000',
      address: 'عمان - الشميساني - شارع عبد الحميد شرف',
      latitude: 31.9688,
      longitude: 35.8942,
      serviceIds: const ['srv_electrical_maintenance', 'srv_plumbing_maintenance', 'srv_ac_maintenance'],
      availableServiceIds: const ['srv_electrical_maintenance', 'srv_plumbing_maintenance', 'srv_ac_maintenance'],
      serviceCategories: const ['cat_home_services'],
      isActive: true,
      isAvailable: true,
      rating: 5.0,
      operatingHours: '24/7 طوارئ وصيانة',
      deliveryCoverageAreas: const ['كافة مناطق عمان'],
      assignedDriverIds: const ['DRV-103'],
      createdAt: DateTime(2026, 1, 1),
    ),
  ];

  late final List<ProviderEntity> _providers = List.from(defaultProviders);

  @override
  Future<List<ProviderEntity>> getProviders({String? serviceCategoryId, String? serviceId, bool includeInactive = false}) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    var list = _providers.where((p) => includeInactive || (p.isActive && p.isAvailable));
    if (serviceCategoryId != null && serviceCategoryId.isNotEmpty) {
      list = list.where((p) => p.serviceCategories.contains(serviceCategoryId));
    }
    if (serviceId != null && serviceId.isNotEmpty) {
      list = list.where((p) => p.isServiceAvailable(serviceId));
    }
    return list.toList();
  }

  @override
  Future<ProviderEntity?> getProviderById(String id) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    try {
      return _providers.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<ProviderEntity?> getProviderForService(String serviceCategoryId) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    try {
      return _providers.firstWhere((p) => p.isActive && p.isAvailable && p.serviceCategories.contains(serviceCategoryId));
    } catch (_) {
      return _providers.isNotEmpty ? _providers.first : null;
    }
  }

  @override
  Future<List<ProviderEntity>> getProvidersForService(String serviceId) async {
    return getProviders(serviceId: serviceId);
  }

  @override
  Future<ProviderEntity> addProvider(ProviderEntity provider) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    final newProv = provider.copyWith(
      id: provider.id.isEmpty ? 'prov_${DateTime.now().millisecondsSinceEpoch}' : provider.id,
      createdAt: DateTime.now(),
    );
    _providers.insert(0, newProv);
    return newProv;
  }

  @override
  Future<ProviderEntity> updateProvider(ProviderEntity provider) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    final index = _providers.indexWhere((p) => p.id == provider.id);
    if (index != -1) {
      _providers[index] = provider;
      return provider;
    }
    _providers.add(provider);
    return provider;
  }

  @override
  Future<void> deleteProvider(String id) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    _providers.removeWhere((p) => p.id == id);
  }

  @override
  Future<Map<String, dynamic>?> getMyProviderProfile() async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    if (_providers.isEmpty) return null;
    final first = _providers.first;
    return {
      'id': first.id,
      'nameAr': first.nameAr,
      'nameEn': first.nameEn,
      'descriptionAr': first.descriptionAr,
      'descriptionEn': first.descriptionEn,
      'logo': first.logo,
      'phoneNumber': first.phoneNumber,
      'address': first.address,
      'latitude': first.latitude,
      'longitude': first.longitude,
      'operatingHours': first.operatingHours,
      'isActive': first.isActive,
      'isAvailable': first.isAvailable,
      'rating': first.rating,
      'serviceIds': first.serviceIds,
      'availableServiceIds': first.availableServiceIds,
      'services': <Map<String, dynamic>>[],
      'coverageAreas': first.deliveryCoverageAreas,
      'deliveryStaff': <Map<String, dynamic>>[],
      'stats': {
        'totalServices': first.serviceIds.length,
        'availableServices': first.availableServiceIds.length,
        'activeOrdersCount': 0,
        'completedOrdersCount': 5,
        'totalOrdersCount': 5,
      },
    };
  }

  @override
  Future<bool> updateMyProviderStatus(bool isAvailable) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    if (_providers.isNotEmpty) {
      _providers[0] = _providers[0].copyWith(isAvailable: isAvailable);
    }
    return true;
  }

  @override
  Future<bool> updateMyProviderProfile(Map<String, dynamic> data) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    if (_providers.isNotEmpty) {
      _providers[0] = _providers[0].copyWith(
        nameAr: data['nameAr']?.toString() ?? _providers[0].nameAr,
        descriptionAr: data['descriptionAr']?.toString() ?? _providers[0].descriptionAr,
        operatingHours: data['operatingHours']?.toString() ?? _providers[0].operatingHours,
        address: data['address']?.toString() ?? _providers[0].address,
      );
    }
    return true;
  }

  @override
  Future<List<Map<String, dynamic>>> getMyProviderOrders() async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    return [];
  }

  @override
  Future<bool> acceptOrder(String orderId, {String? notes}) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    return true;
  }

  @override
  Future<bool> rejectOrder(String orderId, {String? notes}) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    return true;
  }

  @override
  Future<bool> updateOrderStatus(String orderId, String status, {String? notes}) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    return true;
  }

  @override
  Future<List<Map<String, dynamic>>> getMyProviderServices() async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    return [
      {
        'id': 'srv_gas_cylinder',
        'nameAr': 'جرة غاز',
        'nameEn': 'Gas Cylinder',
        'basePrice': 7.0,
        'isAvailable': true,
        'unitAr': 'جرة',
        'unitEn': 'Cylinder',
        'descriptionAr': 'توصيل أسطوانات وجرار الغاز للمنازل والمنشآت مع الفحص والتركيب الفوري الآمن.',
        'categoryId': 'cat_products',
        'iconName': 'gas_cylinder',
      },
      {
        'id': 'srv_water',
        'nameAr': 'مياه',
        'nameEn': 'Water',
        'basePrice': 1.5,
        'isAvailable': true,
        'unitAr': 'قارورة',
        'unitEn': 'Gallon',
        'descriptionAr': 'توصيل مياه الشرب المعقمة والمعدنية وقوارير 19 لتر وكاسات المياه.',
        'categoryId': 'cat_products',
        'iconName': 'water_bottle',
      },
    ];
  }

  @override
  Future<bool> updateServiceAvailability(String serviceId, bool isAvailable) async {
    if (networkDelay > Duration.zero) await Future<void>.delayed(networkDelay);
    return true;
  }
}

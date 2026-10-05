import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';

/// Domain Entity representing a physical Provider / Distribution Shop (e.g. Gas Agency, Water Plant, Fuel Station)
class ProviderEntity {
  final String id;
  final String nameAr;
  final String nameEn;
  final String descriptionAr;
  final String descriptionEn;
  final String logo;
  final String phoneNumber;
  final String address;
  final double latitude;
  final double longitude;
  final List<String> serviceIds; // IDs of specific catalog services provided (e.g. ['srv_gas_cylinder', 'srv_pure_water'])
  final List<String> availableServiceIds; // IDs of currently available catalog services (real-time toggle)
  final List<String> serviceCategories; // e.g. ['cat_products', 'cat_home_services']
  final List<ServiceEntity> services; // Full dynamic joined services with variants/options
  final bool isActive;
  final bool isAvailable; // Online / Offline general toggle
  final double rating;
  final String operatingHours;
  final List<String> deliveryCoverageAreas;
  final List<String> assignedDriverIds;
  final DateTime createdAt;

  const ProviderEntity({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    this.descriptionAr = '',
    this.descriptionEn = '',
    this.logo = '',
    required this.phoneNumber,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.serviceIds = const [],
    this.availableServiceIds = const [],
    this.serviceCategories = const ['cat_products'],
    this.services = const [],
    this.isActive = true,
    this.isAvailable = true,
    this.rating = 5.0,
    this.operatingHours = '08:00 AM - 10:00 PM',
    this.deliveryCoverageAreas = const ['عمان الغربية', 'عمان الشرقية', 'خلدا', 'الجبيهة', 'طبربور', 'عبدون', 'دابوق', 'الشميساني'],
    this.assignedDriverIds = const [],
    required this.createdAt,
  });

  String get name => nameAr;
  String get description => descriptionAr.isNotEmpty ? descriptionAr : descriptionEn;

  /// Returns true if this provider is assigned a specific catalog service
  bool providesService(String serviceId) {
    return serviceIds.contains(serviceId);
  }

  /// Returns true if this product/service is currently available for ordering
  bool isServiceAvailable(String serviceId) {
    if (!isAvailable) return false;
    if (availableServiceIds.isEmpty && serviceIds.isNotEmpty) {
      return serviceIds.contains(serviceId);
    }
    return availableServiceIds.contains(serviceId);
  }

  factory ProviderEntity.fromJson(Map<String, dynamic> json) {
    List<String> srvIds = [];
    if (json['serviceIds'] != null && json['serviceIds'] is List) {
      srvIds = (json['serviceIds'] as List).map((e) => e.toString()).toList();
    }

    List<String> availSrvIds = [];
    if (json['availableServiceIds'] != null && json['availableServiceIds'] is List) {
      availSrvIds = (json['availableServiceIds'] as List).map((e) => e.toString()).toList();
    } else {
      availSrvIds = srvIds;
    }

    List<String> categories = [];
    if (json['serviceCategoryIds'] != null && json['serviceCategoryIds'] is List) {
      categories = (json['serviceCategoryIds'] as List).map((e) => e.toString()).toList();
    } else if (json['serviceCategories'] != null && json['serviceCategories'] is List) {
      categories = (json['serviceCategories'] as List).map((e) => e.toString()).toList();
    }

    List<String> coverage = [];
    if (json['coverageAreas'] != null && json['coverageAreas'] is List) {
      coverage = (json['coverageAreas'] as List).map((e) => e.toString()).toList();
    } else if (json['deliveryCoverageAreas'] != null && json['deliveryCoverageAreas'] is List) {
      coverage = (json['deliveryCoverageAreas'] as List).map((e) => e.toString()).toList();
    }

    List<ServiceEntity> srvEntities = [];
    if (json['services'] != null && json['services'] is List) {
      srvEntities = (json['services'] as List)
          .map((item) => ServiceEntity.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    return ProviderEntity(
      id: json['id'] as String? ?? '',
      nameAr: json['nameAr'] as String? ?? json['name_ar'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? json['name_en'] as String? ?? '',
      descriptionAr: json['descriptionAr'] as String? ?? json['description_ar'] as String? ?? '',
      descriptionEn: json['descriptionEn'] as String? ?? json['description_en'] as String? ?? '',
      logo: json['logo'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? json['phone_number'] as String? ?? '',
      address: json['address'] as String? ?? '',
      latitude: (json['latitude'] is num)
          ? (json['latitude'] as num).toDouble()
          : double.tryParse(json['latitude']?.toString() ?? '31.9539') ?? 31.9539,
      longitude: (json['longitude'] is num)
          ? (json['longitude'] as num).toDouble()
          : double.tryParse(json['longitude']?.toString() ?? '35.9106') ?? 35.9106,
      serviceIds: srvIds,
      availableServiceIds: availSrvIds,
      serviceCategories: categories.isNotEmpty ? categories : const ['cat_products'],
      services: srvEntities,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
      isAvailable: json['isAvailable'] as bool? ?? json['is_available'] as bool? ?? true,
      rating: (json['rating'] is num)
          ? (json['rating'] as num).toDouble()
          : double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
      operatingHours: json['operatingHours'] as String? ?? json['operating_hours'] as String? ?? '08:00 AM - 10:00 PM',
      deliveryCoverageAreas: coverage,
      assignedDriverIds: [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nameAr': nameAr,
      'nameEn': nameEn,
      'descriptionAr': descriptionAr,
      'descriptionEn': descriptionEn,
      'logo': logo,
      'phoneNumber': phoneNumber,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'serviceIds': serviceIds,
      'availableServiceIds': availableServiceIds,
      'serviceCategoryIds': serviceCategories,
      'isActive': isActive,
      'isAvailable': isAvailable,
      'rating': rating,
      'operatingHours': operatingHours,
      'coverageAreas': deliveryCoverageAreas,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  ProviderEntity copyWith({
    String? id,
    String? nameAr,
    String? nameEn,
    String? descriptionAr,
    String? descriptionEn,
    String? logo,
    String? phoneNumber,
    String? address,
    double? latitude,
    double? longitude,
    List<String>? serviceIds,
    List<String>? availableServiceIds,
    List<String>? serviceCategories,
    List<ServiceEntity>? services,
    bool? isActive,
    bool? isAvailable,
    double? rating,
    String? operatingHours,
    List<String>? deliveryCoverageAreas,
    List<String>? assignedDriverIds,
    DateTime? createdAt,
  }) {
    return ProviderEntity(
      id: id ?? this.id,
      nameAr: nameAr ?? this.nameAr,
      nameEn: nameEn ?? this.nameEn,
      descriptionAr: descriptionAr ?? this.descriptionAr,
      descriptionEn: descriptionEn ?? this.descriptionEn,
      logo: logo ?? this.logo,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      serviceIds: serviceIds ?? this.serviceIds,
      availableServiceIds: availableServiceIds ?? this.availableServiceIds,
      serviceCategories: serviceCategories ?? this.serviceCategories,
      services: services ?? this.services,
      isActive: isActive ?? this.isActive,
      isAvailable: isAvailable ?? this.isAvailable,
      rating: rating ?? this.rating,
      operatingHours: operatingHours ?? this.operatingHours,
      deliveryCoverageAreas: deliveryCoverageAreas ?? this.deliveryCoverageAreas,
      assignedDriverIds: assignedDriverIds ?? this.assignedDriverIds,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProviderEntity &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

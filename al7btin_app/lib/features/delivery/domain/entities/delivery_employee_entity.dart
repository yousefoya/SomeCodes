/// Entity representing a delivery employee / partner with category authorization and live coordinates
class DeliveryEmployeeEntity {
  final String id;
  final String name;
  final String phoneNumber;
  final String vehicleType; // e.g. دراجة نارية (Motorcycle), سيارة (Car), شاحنة توصيل (Delivery Truck)
  final String vehiclePlateNumber;
  final bool isActive;
  final bool isOnline;
  final String? providerId; // Associated provider/shop ID (Provider-owned fleet)
  final String? providerName; // Provider display name (e.g. وكالة غاز الأردن المركزية)
  final List<String> serviceCapabilities; // Authorized service IDs e.g. ['srv_gas_cylinder', 'srv_pure_water']
  final List<String> assignedServiceCategories; // Authorized service category IDs e.g. ['cat_products', 'cat_home_services']
  final double latitude;
  final double longitude;
  final int activeOrdersCount;
  final int completedOrdersCount;
  final double rating;
  final DateTime createdAt;

  const DeliveryEmployeeEntity({
    required this.id,
    required this.name,
    required this.phoneNumber,
    required this.vehicleType,
    required this.vehiclePlateNumber,
    this.isActive = true,
    this.isOnline = true,
    this.providerId,
    this.providerName,
    this.serviceCapabilities = const [],
    this.assignedServiceCategories = const ['cat_products'],
    this.latitude = 31.9539, // Default to Amman center
    this.longitude = 35.9106,
    this.activeOrdersCount = 0,
    this.completedOrdersCount = 0,
    this.rating = 5.0,
    required this.createdAt,
  });

  /// Check if this delivery driver is authorized to handle a given specific catalog service
  bool isAuthorizedForService(String serviceId) {
    if (serviceCapabilities.isEmpty) return true; // Default fallback to provider's services
    return serviceCapabilities.contains(serviceId);
  }

  /// Check if this delivery driver is authorized to handle a given service category
  bool isAuthorizedForCategory(String categoryId) {
    if (assignedServiceCategories.isEmpty) return true;
    return assignedServiceCategories.contains(categoryId) ||
        assignedServiceCategories.contains('all') ||
        assignedServiceCategories.contains('*');
  }

  factory DeliveryEmployeeEntity.fromJson(Map<String, dynamic> json) {
    List<String> srvCaps = [];
    if (json['serviceCapabilities'] != null && json['serviceCapabilities'] is List) {
      srvCaps = (json['serviceCapabilities'] as List).map((e) => e.toString()).toList();
    }

    List<String> catCaps = [];
    if (json['categoryCapabilities'] != null && json['categoryCapabilities'] is List) {
      catCaps = (json['categoryCapabilities'] as List).map((e) => e.toString()).toList();
    } else if (json['assignedServiceCategories'] != null && json['assignedServiceCategories'] is List) {
      catCaps = (json['assignedServiceCategories'] as List).map((e) => e.toString()).toList();
    }

    return DeliveryEmployeeEntity(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'مندوب توصيل',
      phoneNumber: json['phoneNumber'] as String? ?? json['phone_number'] as String? ?? '',
      vehicleType: json['vehicleType'] as String? ?? json['vehicle_type'] as String? ?? 'مركبة توزيع',
      vehiclePlateNumber: json['vehiclePlateNumber'] as String? ?? json['vehicle_plate_number'] as String? ?? 'عمومي',
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
      isOnline: json['isOnline'] as bool? ?? json['is_online'] as bool? ?? true,
      providerId: json['providerId'] as String? ?? json['provider_id'] as String?,
      providerName: json['providerName'] as String? ?? json['provider_name'] as String?,
      serviceCapabilities: srvCaps,
      assignedServiceCategories: catCaps.isNotEmpty ? catCaps : const ['cat_products'],
      latitude: (json['latitude'] is num)
          ? (json['latitude'] as num).toDouble()
          : double.tryParse(json['latitude']?.toString() ?? '31.9539') ?? 31.9539,
      longitude: (json['longitude'] is num)
          ? (json['longitude'] as num).toDouble()
          : double.tryParse(json['longitude']?.toString() ?? '35.9106') ?? 35.9106,
      activeOrdersCount: json['activeOrdersCount'] as int? ?? json['active_orders_count'] as int? ?? 0,
      completedOrdersCount: json['completedOrdersCount'] as int? ?? json['completed_orders_count'] as int? ?? 0,
      rating: (json['rating'] is num)
          ? (json['rating'] as num).toDouble()
          : double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phoneNumber': phoneNumber,
      'vehicleType': vehicleType,
      'vehiclePlateNumber': vehiclePlateNumber,
      'providerId': providerId,
      'providerName': providerName,
      'serviceCapabilities': serviceCapabilities,
      'categoryCapabilities': assignedServiceCategories,
      'isActive': isActive,
      'isOnline': isOnline,
      'latitude': latitude,
      'longitude': longitude,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  DeliveryEmployeeEntity copyWith({
    String? id,
    String? name,
    String? phoneNumber,
    String? vehicleType,
    String? vehiclePlateNumber,
    bool? isActive,
    bool? isOnline,
    String? providerId,
    String? providerName,
    List<String>? serviceCapabilities,
    List<String>? assignedServiceCategories,
    double? latitude,
    double? longitude,
    int? activeOrdersCount,
    int? completedOrdersCount,
    double? rating,
    DateTime? createdAt,
  }) {
    return DeliveryEmployeeEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      vehicleType: vehicleType ?? this.vehicleType,
      vehiclePlateNumber: vehiclePlateNumber ?? this.vehiclePlateNumber,
      isActive: isActive ?? this.isActive,
      isOnline: isOnline ?? this.isOnline,
      providerId: providerId ?? this.providerId,
      providerName: providerName ?? this.providerName,
      serviceCapabilities: serviceCapabilities ?? this.serviceCapabilities,
      assignedServiceCategories: assignedServiceCategories ?? this.assignedServiceCategories,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      activeOrdersCount: activeOrdersCount ?? this.activeOrdersCount,
      completedOrdersCount: completedOrdersCount ?? this.completedOrdersCount,
      rating: rating ?? this.rating,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeliveryEmployeeEntity &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

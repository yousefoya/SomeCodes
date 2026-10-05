/// Dynamic Service and Product operation types
enum ServiceType {
  product,
  deliveryProduct,
  homeService;

  static ServiceType fromString(String? type) {
    switch (type) {
      case 'home_service':
      case 'homeService':
        return ServiceType.homeService;
      case 'delivery_product':
      case 'deliveryProduct':
      case 'product':
      default:
        return ServiceType.deliveryProduct;
    }
  }

  String toBackendString() {
    switch (this) {
      case ServiceType.homeService:
        return 'home_service';
      case ServiceType.product:
      case ServiceType.deliveryProduct:
        return 'delivery_product';
    }
  }
}

/// Dynamic Service Option / Variant Domain Entity (e.g. Cups, 19L Gallons, 330ml Bottles, Sizes, Tanks)
class ServiceOptionEntity {
  final String id;
  final String serviceId;
  final String nameAr;
  final String nameEn;
  final String optionType;
  final String? size;
  final double price;
  final String unitAr;
  final String unitEn;
  final int sortOrder;
  final bool isAvailable;
  final bool isActive;
  final bool supportsInstallation;
  final double? productOnlyPrice;
  final double? installationPrice;
  final String? unitOfMeasure;
  final int minQuantity;
  final int maxQuantity;
  final int incrementStep;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ServiceOptionEntity({
    required this.id,
    required this.serviceId,
    required this.nameAr,
    required this.nameEn,
    this.optionType = 'variant',
    this.size,
    required this.price,
    this.unitAr = 'وحدة',
    this.unitEn = 'Unit',
    this.sortOrder = 0,
    this.isAvailable = true,
    this.isActive = true,
    this.supportsInstallation = false,
    this.productOnlyPrice,
    this.installationPrice,
    this.unitOfMeasure,
    this.minQuantity = 1,
    this.maxQuantity = 999,
    this.incrementStep = 1,
    this.createdAt,
    this.updatedAt,
  });

  String get name => nameAr;
  String get unit => unitAr;

  factory ServiceOptionEntity.fromJson(Map<String, dynamic> json) {
    return ServiceOptionEntity(
      id: json['id'] as String? ?? '',
      serviceId: json['serviceId'] as String? ?? json['service_id'] as String? ?? '',
      nameAr: json['nameAr'] as String? ?? json['name_ar'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? json['name_en'] as String? ?? '',
      optionType: json['optionType'] as String? ?? json['option_type'] as String? ?? 'variant',
      size: json['size'] as String?,
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0.0') ?? 0.0,
      unitAr: json['unitAr'] as String? ?? json['unit_ar'] as String? ?? 'وحدة',
      unitEn: json['unitEn'] as String? ?? json['unit_en'] as String? ?? 'Unit',
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? (json['sort_order'] as num?)?.toInt() ?? 0,
      isAvailable: json['isAvailable'] as bool? ?? json['is_available'] as bool? ?? true,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
      supportsInstallation: json['supportsInstallation'] as bool? ?? json['supports_installation'] as bool? ?? false,
      productOnlyPrice: (json['productOnlyPrice'] is num)
          ? (json['productOnlyPrice'] as num).toDouble()
          : double.tryParse(json['productOnlyPrice']?.toString() ?? json['product_only_price']?.toString() ?? ''),
      installationPrice: (json['installationPrice'] is num)
          ? (json['installationPrice'] as num).toDouble()
          : double.tryParse(json['installationPrice']?.toString() ?? json['installation_price']?.toString() ?? ''),
      unitOfMeasure: json['unitOfMeasure'] as String? ?? json['unit_of_measure'] as String?,
      minQuantity: (json['minQuantity'] as num?)?.toInt() ?? (json['min_quantity'] as num?)?.toInt() ?? 1,
      maxQuantity: (json['maxQuantity'] as num?)?.toInt() ?? (json['max_quantity'] as num?)?.toInt() ?? 999,
      incrementStep: (json['incrementStep'] as num?)?.toInt() ?? (json['increment_step'] as num?)?.toInt() ?? 1,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'serviceId': serviceId,
      'nameAr': nameAr,
      'nameEn': nameEn,
      'optionType': optionType,
      'size': size,
      'price': price,
      'unitAr': unitAr,
      'unitEn': unitEn,
      'sortOrder': sortOrder,
      'isAvailable': isAvailable,
      'isActive': isActive,
      'supportsInstallation': supportsInstallation,
      'productOnlyPrice': productOnlyPrice,
      'installationPrice': installationPrice,
      'unitOfMeasure': unitOfMeasure,
      'minQuantity': minQuantity,
      'maxQuantity': maxQuantity,
      'incrementStep': incrementStep,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  ServiceOptionEntity copyWith({
    String? id,
    String? serviceId,
    String? nameAr,
    String? nameEn,
    String? optionType,
    String? size,
    double? price,
    String? unitAr,
    String? unitEn,
    int? sortOrder,
    bool? isAvailable,
    bool? isActive,
    bool? supportsInstallation,
    double? productOnlyPrice,
    double? installationPrice,
    String? unitOfMeasure,
    int? minQuantity,
    int? maxQuantity,
    int? incrementStep,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ServiceOptionEntity(
      id: id ?? this.id,
      serviceId: serviceId ?? this.serviceId,
      nameAr: nameAr ?? this.nameAr,
      nameEn: nameEn ?? this.nameEn,
      optionType: optionType ?? this.optionType,
      size: size ?? this.size,
      price: price ?? this.price,
      unitAr: unitAr ?? this.unitAr,
      unitEn: unitEn ?? this.unitEn,
      sortOrder: sortOrder ?? this.sortOrder,
      isAvailable: isAvailable ?? this.isAvailable,
      isActive: isActive ?? this.isActive,
      supportsInstallation: supportsInstallation ?? this.supportsInstallation,
      productOnlyPrice: productOnlyPrice ?? this.productOnlyPrice,
      installationPrice: installationPrice ?? this.installationPrice,
      unitOfMeasure: unitOfMeasure ?? this.unitOfMeasure,
      minQuantity: minQuantity ?? this.minQuantity,
      maxQuantity: maxQuantity ?? this.maxQuantity,
      incrementStep: incrementStep ?? this.incrementStep,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ServiceOptionEntity &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Dynamic Service/Product Domain Entity
class ServiceEntity {
  final String id;
  final String categoryId;
  final String? providerId;
  final String nameAr;
  final String nameEn;
  final String descriptionAr;
  final String descriptionEn;
  final String? imageUrl;
  final bool isActive;
  final bool isAvailable;
  final ServiceType type;
  final double basePrice;
  final String unitAr;
  final String unitEn;
  final bool requiresQuotation;
  final String serviceMode;
  final bool isLaborOnly;
  final double laborStartingPrice;
  final String? disclaimerText;
  final bool supportsInstallation;
  final double? productOnlyPrice;
  final double? installationPrice;
  final String? unitOfMeasure;
  final int minQuantity;
  final int maxQuantity;
  final int incrementStep;
  final List<ServiceOptionEntity> options;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ServiceEntity({
    required this.id,
    required this.categoryId,
    this.providerId,
    required this.nameAr,
    required this.nameEn,
    required this.descriptionAr,
    required this.descriptionEn,
    this.imageUrl,
    this.isActive = true,
    this.isAvailable = true,
    required this.type,
    required this.basePrice,
    this.unitAr = 'خدمة',
    this.unitEn = 'Service',
    this.requiresQuotation = false,
    this.serviceMode = 'standard',
    this.isLaborOnly = false,
    this.laborStartingPrice = 5.0,
    this.disclaimerText,
    this.supportsInstallation = false,
    this.productOnlyPrice,
    this.installationPrice,
    this.unitOfMeasure,
    this.minQuantity = 1,
    this.maxQuantity = 999,
    this.incrementStep = 1,
    this.options = const [],
    this.createdAt,
    this.updatedAt,
  });

  String get name => nameAr;
  String get description => descriptionAr;
  String get unit => unitAr;

  bool get isHomeService => type == ServiceType.homeService;
  bool get isDeliveryProduct => type == ServiceType.deliveryProduct || type == ServiceType.product;
  bool get isProduct => isDeliveryProduct;

  bool get hasOptions => options.isNotEmpty;

  factory ServiceEntity.fromJson(Map<String, dynamic> json) {
    List<ServiceOptionEntity> parsedOptions = [];
    if (json['options'] != null && json['options'] is List) {
      parsedOptions = (json['options'] as List)
          .map((optJson) => ServiceOptionEntity.fromJson(optJson as Map<String, dynamic>))
          .toList();
    }

    return ServiceEntity(
      id: json['id'] as String? ?? '',
      categoryId: json['categoryId'] as String? ?? json['category_id'] as String? ?? '',
      providerId: json['providerId'] as String? ?? json['provider_id'] as String?,
      nameAr: json['nameAr'] as String? ?? json['name_ar'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? json['name_en'] as String? ?? '',
      descriptionAr: json['descriptionAr'] as String? ?? json['description_ar'] as String? ?? '',
      descriptionEn: json['descriptionEn'] as String? ?? json['description_en'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
      isAvailable: json['isAvailable'] as bool? ?? json['is_available'] as bool? ?? true,
      type: ServiceType.fromString(json['type'] as String?),
      basePrice: (json['basePrice'] is num)
          ? (json['basePrice'] as num).toDouble()
          : double.tryParse(json['basePrice']?.toString() ?? json['base_price']?.toString() ?? '0.0') ?? 0.0,
      unitAr: json['unitAr'] as String? ?? json['unit_ar'] as String? ?? 'خدمة',
      unitEn: json['unitEn'] as String? ?? json['unit_en'] as String? ?? 'Service',
      requiresQuotation: json['requiresQuotation'] as bool? ?? json['requires_quotation'] as bool? ?? false,
      serviceMode: json['serviceMode'] as String? ?? json['service_mode'] as String? ?? 'standard',
      isLaborOnly: json['isLaborOnly'] as bool? ?? json['is_labor_only'] as bool? ?? false,
      laborStartingPrice: (json['laborStartingPrice'] is num)
          ? (json['laborStartingPrice'] as num).toDouble()
          : (json['labor_starting_price'] is num)
              ? (json['labor_starting_price'] as num).toDouble()
              : double.tryParse(json['laborStartingPrice']?.toString() ?? json['labor_starting_price']?.toString() ?? '5.0') ?? 5.0,
      disclaimerText: json['disclaimerText'] as String? ?? json['disclaimer_text'] as String?,
      supportsInstallation: json['supportsInstallation'] as bool? ?? json['supports_installation'] as bool? ?? false,
      productOnlyPrice: (json['productOnlyPrice'] is num)
          ? (json['productOnlyPrice'] as num).toDouble()
          : double.tryParse(json['productOnlyPrice']?.toString() ?? json['product_only_price']?.toString() ?? ''),
      installationPrice: (json['installationPrice'] is num)
          ? (json['installationPrice'] as num).toDouble()
          : double.tryParse(json['installationPrice']?.toString() ?? json['installation_price']?.toString() ?? ''),
      unitOfMeasure: json['unitOfMeasure'] as String? ?? json['unit_of_measure'] as String?,
      minQuantity: (json['minQuantity'] as num?)?.toInt() ?? (json['min_quantity'] as num?)?.toInt() ?? 1,
      maxQuantity: (json['maxQuantity'] as num?)?.toInt() ?? (json['max_quantity'] as num?)?.toInt() ?? 999,
      incrementStep: (json['incrementStep'] as num?)?.toInt() ?? (json['increment_step'] as num?)?.toInt() ?? 1,
      options: parsedOptions,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'categoryId': categoryId,
      'providerId': providerId,
      'nameAr': nameAr,
      'nameEn': nameEn,
      'descriptionAr': descriptionAr,
      'descriptionEn': descriptionEn,
      'type': type.toBackendString(),
      'basePrice': basePrice,
      'unitAr': unitAr,
      'unitEn': unitEn,
      'requiresQuotation': requiresQuotation,
      'serviceMode': serviceMode,
      'isLaborOnly': isLaborOnly,
      'laborStartingPrice': laborStartingPrice,
      'disclaimerText': disclaimerText,
      'supportsInstallation': supportsInstallation,
      'productOnlyPrice': productOnlyPrice,
      'installationPrice': installationPrice,
      'unitOfMeasure': unitOfMeasure,
      'minQuantity': minQuantity,
      'maxQuantity': maxQuantity,
      'incrementStep': incrementStep,
      'isAvailable': isAvailable,
      'isActive': isActive,
      'options': options.map((opt) => opt.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  ServiceEntity copyWith({
    String? id,
    String? categoryId,
    String? providerId,
    String? nameAr,
    String? nameEn,
    String? descriptionAr,
    String? descriptionEn,
    String? imageUrl,
    bool? isActive,
    bool? isAvailable,
    ServiceType? type,
    double? basePrice,
    String? unitAr,
    String? unitEn,
    bool? requiresQuotation,
    String? serviceMode,
    bool? isLaborOnly,
    double? laborStartingPrice,
    String? disclaimerText,
    bool? supportsInstallation,
    double? productOnlyPrice,
    double? installationPrice,
    String? unitOfMeasure,
    int? minQuantity,
    int? maxQuantity,
    int? incrementStep,
    List<ServiceOptionEntity>? options,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ServiceEntity(
      id: id ?? this.id,
      categoryId: categoryId ?? this.categoryId,
      providerId: providerId ?? this.providerId,
      nameAr: nameAr ?? this.nameAr,
      nameEn: nameEn ?? this.nameEn,
      descriptionAr: descriptionAr ?? this.descriptionAr,
      descriptionEn: descriptionEn ?? this.descriptionEn,
      imageUrl: imageUrl ?? this.imageUrl,
      isActive: isActive ?? this.isActive,
      isAvailable: isAvailable ?? this.isAvailable,
      type: type ?? this.type,
      basePrice: basePrice ?? this.basePrice,
      unitAr: unitAr ?? this.unitAr,
      unitEn: unitEn ?? this.unitEn,
      requiresQuotation: requiresQuotation ?? this.requiresQuotation,
      serviceMode: serviceMode ?? this.serviceMode,
      isLaborOnly: isLaborOnly ?? this.isLaborOnly,
      laborStartingPrice: laborStartingPrice ?? this.laborStartingPrice,
      disclaimerText: disclaimerText ?? this.disclaimerText,
      supportsInstallation: supportsInstallation ?? this.supportsInstallation,
      productOnlyPrice: productOnlyPrice ?? this.productOnlyPrice,
      installationPrice: installationPrice ?? this.installationPrice,
      unitOfMeasure: unitOfMeasure ?? this.unitOfMeasure,
      minQuantity: minQuantity ?? this.minQuantity,
      maxQuantity: maxQuantity ?? this.maxQuantity,
      incrementStep: incrementStep ?? this.incrementStep,
      options: options ?? this.options,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ServiceEntity &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';

/// Entity representing an item in the customer cart with exact frozen unit price & variant details
class CartItemEntity {
  final String id;
  final String serviceId;
  final String? providerId;
  final String? providerNameAr;
  final String? providerNameEn;
  final String? selectedOptionId;
  final String? selectedOptionNameAr;
  final String? selectedOptionNameEn;
  final String? selectedOptionSize;
  final String serviceNameAr;
  final String serviceNameEn;
  final ServiceType serviceType;
  final double unitPrice;
  final int quantity;
  final String unitAr;
  final String unitEn;
  final String? imageUrl;
  final String? notes;
  final bool requiresQuotation;
  final Map<String, dynamic>? configurationSnapshot;
  final List<Map<String, dynamic>>? priceBreakdown;
  final int? serviceVersion;

  const CartItemEntity({
    required this.id,
    required this.serviceId,
    this.providerId,
    this.providerNameAr,
    this.providerNameEn,
    this.selectedOptionId,
    this.selectedOptionNameAr,
    this.selectedOptionNameEn,
    this.selectedOptionSize,
    required this.serviceNameAr,
    required this.serviceNameEn,
    required this.serviceType,
    required this.unitPrice,
    required this.quantity,
    required this.unitAr,
    required this.unitEn,
    this.imageUrl,
    this.notes,
    this.requiresQuotation = false,
    this.configurationSnapshot,
    this.priceBreakdown,
    this.serviceVersion,
  });

  /// Factory creating a CartItemEntity from a ServiceEntity preserving exact unit price
  factory CartItemEntity.fromService(
    ServiceEntity service, {
    String? providerId,
    String? providerNameAr,
    String? providerNameEn,
    ServiceOptionEntity? selectedOption,
    int quantity = 1,
    String? notes,
  }) {
    if (selectedOption != null) {
      return CartItemEntity(
        id: 'CART-ITEM-${service.id}-${selectedOption.id}-${DateTime.now().millisecondsSinceEpoch}',
        serviceId: service.id,
        providerId: providerId,
        providerNameAr: providerNameAr,
        providerNameEn: providerNameEn,
        selectedOptionId: selectedOption.id,
        selectedOptionNameAr: selectedOption.nameAr,
        selectedOptionNameEn: selectedOption.nameEn,
        selectedOptionSize: selectedOption.size,
        serviceNameAr: '${service.nameAr} - ${selectedOption.nameAr}',
        serviceNameEn: '${service.nameEn} - ${selectedOption.nameEn}',
        serviceType: service.type,
        unitPrice: selectedOption.price,
        quantity: quantity > 0 ? quantity : 1,
        unitAr: selectedOption.unitAr,
        unitEn: selectedOption.unitEn,
        imageUrl: service.imageUrl,
        notes: notes,
        requiresQuotation: service.requiresQuotation,
      );
    }

    return CartItemEntity(
      id: 'CART-ITEM-${service.id}-${DateTime.now().millisecondsSinceEpoch}',
      serviceId: service.id,
      providerId: providerId,
      providerNameAr: providerNameAr,
      providerNameEn: providerNameEn,
      selectedOptionId: null,
      selectedOptionNameAr: null,
      selectedOptionNameEn: null,
      selectedOptionSize: null,
      serviceNameAr: service.nameAr,
      serviceNameEn: service.nameEn,
      serviceType: service.type,
      unitPrice: service.basePrice,
      quantity: quantity > 0 ? quantity : 1,
      unitAr: service.unitAr,
      unitEn: service.unitEn,
      imageUrl: service.imageUrl,
      notes: notes,
      requiresQuotation: service.requiresQuotation,
    );
  }

  /// Exact item total: unit price × quantity
  double get itemTotal => unitPrice * quantity;

  bool get isHomeService => serviceType == ServiceType.homeService;
  bool get isDeliveryProduct => serviceType == ServiceType.deliveryProduct;

  CartItemEntity copyWith({
    String? id,
    String? serviceId,
    String? providerId,
    String? providerNameAr,
    String? providerNameEn,
    String? selectedOptionId,
    String? selectedOptionNameAr,
    String? selectedOptionNameEn,
    String? selectedOptionSize,
    String? serviceNameAr,
    String? serviceNameEn,
    ServiceType? serviceType,
    double? unitPrice,
    int? quantity,
    String? unitAr,
    String? unitEn,
    String? imageUrl,
    String? notes,
    bool? requiresQuotation,
  }) {
    return CartItemEntity(
      id: id ?? this.id,
      serviceId: serviceId ?? this.serviceId,
      providerId: providerId ?? this.providerId,
      providerNameAr: providerNameAr ?? this.providerNameAr,
      providerNameEn: providerNameEn ?? this.providerNameEn,
      selectedOptionId: selectedOptionId ?? this.selectedOptionId,
      selectedOptionNameAr: selectedOptionNameAr ?? this.selectedOptionNameAr,
      selectedOptionNameEn: selectedOptionNameEn ?? this.selectedOptionNameEn,
      selectedOptionSize: selectedOptionSize ?? this.selectedOptionSize,
      serviceNameAr: serviceNameAr ?? this.serviceNameAr,
      serviceNameEn: serviceNameEn ?? this.serviceNameEn,
      serviceType: serviceType ?? this.serviceType,
      unitPrice: unitPrice ?? this.unitPrice,
      quantity: quantity ?? this.quantity,
      unitAr: unitAr ?? this.unitAr,
      unitEn: unitEn ?? this.unitEn,
      imageUrl: imageUrl ?? this.imageUrl,
      notes: notes ?? this.notes,
      requiresQuotation: requiresQuotation ?? this.requiresQuotation,
    );
  }
}

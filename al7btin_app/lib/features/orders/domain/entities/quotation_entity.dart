/// Quotation line item types
enum QuotationLineItemType {
  labor,
  material,
  sparePart,
  equipment,
  other;

  static QuotationLineItemType fromString(String? type) {
    switch (type) {
      case 'labor':
        return QuotationLineItemType.labor;
      case 'material':
        return QuotationLineItemType.material;
      case 'spare_part':
      case 'sparePart':
        return QuotationLineItemType.sparePart;
      case 'equipment':
        return QuotationLineItemType.equipment;
      default:
        return QuotationLineItemType.other;
    }
  }

  String get labelAr {
    switch (this) {
      case QuotationLineItemType.labor:
        return 'أجرة يد / عمل';
      case QuotationLineItemType.material:
        return 'مواد ومستلزمات';
      case QuotationLineItemType.sparePart:
        return 'قطع غيار';
      case QuotationLineItemType.equipment:
        return 'معدات وآليات';
      case QuotationLineItemType.other:
        return 'أخرى';
    }
  }

  String get labelEn {
    switch (this) {
      case QuotationLineItemType.labor:
        return 'Labor Fee';
      case QuotationLineItemType.material:
        return 'Materials';
      case QuotationLineItemType.sparePart:
        return 'Spare Parts';
      case QuotationLineItemType.equipment:
        return 'Equipment';
      case QuotationLineItemType.other:
        return 'Other';
    }
  }
}

/// Generic quotation line item breakdown
class QuotationLineItemEntity {
  final String id;
  final String quotationId;
  final QuotationLineItemType itemType;
  final String descriptionAr;
  final String descriptionEn;
  final double quantity;
  final double unitPrice;
  final double totalPrice;

  const QuotationLineItemEntity({
    required this.id,
    required this.quotationId,
    required this.itemType,
    required this.descriptionAr,
    required this.descriptionEn,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
  });

  factory QuotationLineItemEntity.fromJson(Map<String, dynamic> json) {
    return QuotationLineItemEntity(
      id: json['id'] as String? ?? '',
      quotationId: json['quotationId'] as String? ?? json['quotation_id'] as String? ?? '',
      itemType: QuotationLineItemType.fromString(json['itemType'] as String? ?? json['item_type'] as String?),
      descriptionAr: json['descriptionAr'] as String? ?? json['description_ar'] as String? ?? '',
      descriptionEn: json['descriptionEn'] as String? ?? json['description_en'] as String? ?? '',
      quantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toDouble()
          : double.tryParse(json['quantity']?.toString() ?? '1.0') ?? 1.0,
      unitPrice: (json['unitPrice'] is num)
          ? (json['unitPrice'] as num).toDouble()
          : (json['unit_price'] is num)
              ? (json['unit_price'] as num).toDouble()
              : double.tryParse(json['unitPrice']?.toString() ?? json['unit_price']?.toString() ?? '0.0') ?? 0.0,
      totalPrice: (json['totalPrice'] is num)
          ? (json['totalPrice'] as num).toDouble()
          : (json['total_price'] is num)
              ? (json['total_price'] as num).toDouble()
              : double.tryParse(json['totalPrice']?.toString() ?? json['total_price']?.toString() ?? '0.0') ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'quotationId': quotationId,
      'itemType': itemType.name,
      'descriptionAr': descriptionAr,
      'descriptionEn': descriptionEn,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
    };
  }
}

/// Quotation status lifecycle
enum QuotationStatus {
  draft,
  sent,
  customerApproved,
  customerRejected,
  adminCancelled;

  static QuotationStatus fromString(String? status) {
    switch (status) {
      case 'sent':
        return QuotationStatus.sent;
      case 'customer_approved':
      case 'customerApproved':
        return QuotationStatus.customerApproved;
      case 'customer_rejected':
      case 'customerRejected':
        return QuotationStatus.customerRejected;
      case 'admin_cancelled':
      case 'adminCancelled':
        return QuotationStatus.adminCancelled;
      case 'draft':
      default:
        return QuotationStatus.draft;
    }
  }

  String get labelAr {
    switch (this) {
      case QuotationStatus.draft:
        return 'مسودة';
      case QuotationStatus.sent:
        return 'بانتظار موافقة العميل';
      case QuotationStatus.customerApproved:
        return 'تمت الموافقة من العميل';
      case QuotationStatus.customerRejected:
        return 'مرفوض من العميل';
      case QuotationStatus.adminCancelled:
        return 'ملغي من الإدارة';
    }
  }

  String get labelEn {
    switch (this) {
      case QuotationStatus.draft:
        return 'Draft';
      case QuotationStatus.sent:
        return 'Awaiting Customer Approval';
      case QuotationStatus.customerApproved:
        return 'Customer Approved';
      case QuotationStatus.customerRejected:
        return 'Customer Rejected';
      case QuotationStatus.adminCancelled:
        return 'Cancelled';
    }
  }
}

/// Generic quotation domain entity for specialized services
class QuotationEntity {
  final String id;
  final String orderId;
  final String providerId;
  final String customerId;
  final QuotationStatus status;
  final double totalAmount;
  final double laborCost;
  final double materialsCost;
  final double sparePartsCost;
  final double equipmentCost;
  final String? notes;
  final String? rejectionReason;
  final List<QuotationLineItemEntity> items;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const QuotationEntity({
    required this.id,
    required this.orderId,
    required this.providerId,
    required this.customerId,
    this.status = QuotationStatus.sent,
    required this.totalAmount,
    this.laborCost = 0.0,
    this.materialsCost = 0.0,
    this.sparePartsCost = 0.0,
    this.equipmentCost = 0.0,
    this.notes,
    this.rejectionReason,
    this.items = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory QuotationEntity.fromJson(Map<String, dynamic> json) {
    List<QuotationLineItemEntity> parsedItems = [];
    if (json['items'] != null && json['items'] is List) {
      parsedItems = (json['items'] as List)
          .map((it) => QuotationLineItemEntity.fromJson(it as Map<String, dynamic>))
          .toList();
    }

    return QuotationEntity(
      id: json['id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? json['order_id'] as String? ?? '',
      providerId: json['providerId'] as String? ?? json['provider_id'] as String? ?? '',
      customerId: json['customerId'] as String? ?? json['customer_id'] as String? ?? '',
      status: QuotationStatus.fromString(json['status'] as String?),
      totalAmount: (json['totalAmount'] is num)
          ? (json['totalAmount'] as num).toDouble()
          : (json['total_amount'] is num)
              ? (json['total_amount'] as num).toDouble()
              : double.tryParse(json['totalAmount']?.toString() ?? json['total_amount']?.toString() ?? '0.0') ?? 0.0,
      laborCost: (json['laborCost'] is num)
          ? (json['laborCost'] as num).toDouble()
          : (json['labor_cost'] is num)
              ? (json['labor_cost'] as num).toDouble()
              : double.tryParse(json['laborCost']?.toString() ?? json['labor_cost']?.toString() ?? '0.0') ?? 0.0,
      materialsCost: (json['materialsCost'] is num)
          ? (json['materialsCost'] as num).toDouble()
          : (json['materials_cost'] is num)
              ? (json['materials_cost'] as num).toDouble()
              : double.tryParse(json['materialsCost']?.toString() ?? json['materials_cost']?.toString() ?? '0.0') ?? 0.0,
      sparePartsCost: (json['sparePartsCost'] is num)
          ? (json['sparePartsCost'] as num).toDouble()
          : (json['spare_parts_cost'] is num)
              ? (json['spare_parts_cost'] as num).toDouble()
              : double.tryParse(json['sparePartsCost']?.toString() ?? json['spare_parts_cost']?.toString() ?? '0.0') ?? 0.0,
      equipmentCost: (json['equipmentCost'] is num)
          ? (json['equipmentCost'] as num).toDouble()
          : (json['equipment_cost'] is num)
              ? (json['equipment_cost'] as num).toDouble()
              : double.tryParse(json['equipmentCost']?.toString() ?? json['equipment_cost']?.toString() ?? '0.0') ?? 0.0,
      notes: json['notes'] as String?,
      rejectionReason: json['rejectionReason'] as String? ?? json['rejection_reason'] as String?,
      items: parsedItems,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'providerId': providerId,
      'customerId': customerId,
      'status': status.name,
      'totalAmount': totalAmount,
      'laborCost': laborCost,
      'materialsCost': materialsCost,
      'sparePartsCost': sparePartsCost,
      'equipmentCost': equipmentCost,
      'notes': notes,
      'rejectionReason': rejectionReason,
      'items': items.map((i) => i.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

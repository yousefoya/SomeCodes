enum CouponType {
  percentage,
  fixedAmount,
}

/// Dynamic Coupon entity managed by Admin and applied in Customer Checkout
class CouponEntity {
  final String id;
  final String code;
  final CouponType type;
  final double value; // percentage (e.g. 15 for 15%) or fixed JOD (e.g. 5.0 for 5 JOD)
  final double minOrderValue;
  final DateTime? expiryDate;
  final int usageLimit;
  final int usageCount;
  final bool isActive;
  final DateTime createdAt;

  const CouponEntity({
    required this.id,
    required this.code,
    required this.type,
    required this.value,
    this.minOrderValue = 0.0,
    this.expiryDate,
    this.usageLimit = 1000,
    this.usageCount = 0,
    this.isActive = true,
    required this.createdAt,
  });

  /// Calculates discount on a given subtotal
  double calculateDiscount(double subtotal) {
    if (!isActive) return 0.0;
    if (subtotal < minOrderValue) return 0.0;
    if (expiryDate != null && DateTime.now().isAfter(expiryDate!)) return 0.0;
    if (usageCount >= usageLimit) return 0.0;

    double discount = 0.0;
    if (type == CouponType.percentage) {
      discount = subtotal * (value / 100.0);
    } else {
      discount = value;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }
    return double.parse(discount.toStringAsFixed(2));
  }

  factory CouponEntity.fromJson(Map<String, dynamic> json) {
    return CouponEntity(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      type: json['type'] == 'fixed_amount' ? CouponType.fixedAmount : CouponType.percentage,
      value: (json['value'] is num)
          ? (json['value'] as num).toDouble()
          : double.tryParse(json['value']?.toString() ?? '0') ?? 0.0,
      minOrderValue: (json['minOrderValue'] is num)
          ? (json['minOrderValue'] as num).toDouble()
          : double.tryParse(json['minOrderValue']?.toString() ?? '0') ?? 0.0,
      expiryDate: json['expiryDate'] != null ? DateTime.tryParse(json['expiryDate'].toString()) : null,
      usageLimit: (json['usageLimit'] is num)
          ? (json['usageLimit'] as num).toInt()
          : int.tryParse(json['usageLimit']?.toString() ?? '1000') ?? 1000,
      usageCount: (json['usageCount'] is num)
          ? (json['usageCount'] as num).toInt()
          : int.tryParse(json['usageCount']?.toString() ?? '0') ?? 0,
      isActive: json['isActive'] == true || json['is_active'] == true,
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'type': type == CouponType.fixedAmount ? 'fixed_amount' : 'percentage',
      'value': value,
      'minOrderValue': minOrderValue,
      'expiryDate': expiryDate?.toIso8601String(),
      'usageLimit': usageLimit,
      'usageCount': usageCount,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  CouponEntity copyWith({
    String? id,
    String? code,
    CouponType? type,
    double? value,
    double? minOrderValue,
    DateTime? expiryDate,
    int? usageLimit,
    int? usageCount,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return CouponEntity(
      id: id ?? this.id,
      code: code ?? this.code,
      type: type ?? this.type,
      value: value ?? this.value,
      minOrderValue: minOrderValue ?? this.minOrderValue,
      expiryDate: expiryDate ?? this.expiryDate,
      usageLimit: usageLimit ?? this.usageLimit,
      usageCount: usageCount ?? this.usageCount,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

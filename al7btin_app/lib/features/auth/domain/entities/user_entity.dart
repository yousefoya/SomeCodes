/// User roles supported across the platform
enum UserRole {
  customer,
  delivery,
  admin,
  provider,
  supplier,
  technician;

  String get labelAr {
    switch (this) {
      case UserRole.customer:
        return 'عميل';
      case UserRole.delivery:
        return 'مندوب توصيل';
      case UserRole.admin:
        return 'مسؤول النظام (Admin)';
      case UserRole.provider:
        return 'مزود خدمة / متجر';
      case UserRole.supplier:
        return 'مورد';
      case UserRole.technician:
        return 'فني معتمد';
    }
  }

  String get labelEn {
    switch (this) {
      case UserRole.customer:
        return 'Customer';
      case UserRole.delivery:
        return 'Delivery Partner';
      case UserRole.admin:
        return 'System Administrator';
      case UserRole.provider:
        return 'Provider / Shop';
      case UserRole.supplier:
        return 'Supplier';
      case UserRole.technician:
        return 'Certified Technician';
    }
  }

  static UserRole fromString(String? role) {
    switch (role?.toLowerCase()) {
      case 'admin':
        return UserRole.admin;
      case 'delivery':
        return UserRole.delivery;
      case 'provider':
        return UserRole.provider;
      case 'supplier':
        return UserRole.supplier;
      case 'technician':
        return UserRole.technician;
      case 'customer':
      default:
        return UserRole.customer;
    }
  }

  String toBackendString() {
    switch (this) {
      case UserRole.admin:
        return 'admin';
      case UserRole.delivery:
        return 'delivery';
      case UserRole.provider:
        return 'provider';
      case UserRole.supplier:
        return 'provider';
      case UserRole.technician:
        return 'delivery';
      case UserRole.customer:
        return 'customer';
    }
  }
}

/// Core User entity
class UserEntity {
  final String id;
  final String phoneNumber;
  final String? name;
  final String? email;
  final UserRole role;
  final double walletBalance;
  final int points;
  final String? referralCode;
  final bool isSuspended;
  final int totalOrdersCount;
  final DateTime createdAt;

  const UserEntity({
    required this.id,
    required this.phoneNumber,
    this.name,
    this.email,
    this.role = UserRole.customer,
    this.walletBalance = 0.0,
    this.points = 0,
    this.referralCode,
    this.isSuspended = false,
    this.totalOrdersCount = 0,
    required this.createdAt,
  });

  bool get isAdmin => role == UserRole.admin;
  bool get isDelivery => role == UserRole.delivery;
  bool get isProvider => role == UserRole.provider;
  bool get isCustomer => role == UserRole.customer;

  factory UserEntity.fromJson(Map<String, dynamic> json) {
    return UserEntity(
      id: json['id'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      name: json['name'] as String?,
      email: json['email'] as String?,
      role: UserRole.fromString(json['role'] as String?),
      walletBalance: (json['walletBalance'] is num)
          ? (json['walletBalance'] as num).toDouble()
          : double.tryParse(json['walletBalance']?.toString() ?? '0.0') ?? 0.0,
      points: (json['points'] as num?)?.toInt() ?? 0,
      referralCode: json['referralCode'] as String?,
      isSuspended: json['isSuspended'] as bool? ?? false,
      totalOrdersCount: (json['totalOrdersCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'name': name,
      'email': email,
      'role': role.name,
      'walletBalance': walletBalance,
      'points': points,
      'referralCode': referralCode,
      'isSuspended': isSuspended,
      'totalOrdersCount': totalOrdersCount,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  UserEntity copyWith({
    String? id,
    String? phoneNumber,
    String? name,
    String? email,
    UserRole? role,
    double? walletBalance,
    int? points,
    String? referralCode,
    bool? isSuspended,
    int? totalOrdersCount,
    DateTime? createdAt,
  }) {
    return UserEntity(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      walletBalance: walletBalance ?? this.walletBalance,
      points: points ?? this.points,
      referralCode: referralCode ?? this.referralCode,
      isSuspended: isSuspended ?? this.isSuspended,
      totalOrdersCount: totalOrdersCount ?? this.totalOrdersCount,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          phoneNumber == other.phoneNumber;

  @override
  int get hashCode => id.hashCode ^ phoneNumber.hashCode;
}

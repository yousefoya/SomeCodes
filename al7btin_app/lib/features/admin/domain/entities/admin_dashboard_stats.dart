import 'package:flutter/foundation.dart';

/// Live aggregated dashboard statistics from PostgreSQL backend
@immutable
class AdminDashboardStats {
  final int totalUsers;
  final int activeUsers;
  final int suspendedUsers;
  final AdminUsersByRole usersByRole;
  final int totalOrders;
  final int completedOrders;
  final int activeOrders;
  final int cancelledOrders;
  final double totalRevenue;
  final int totalProviders;
  final int activeProviders;
  final int totalDrivers;
  final int activeDrivers;
  final int onlineDrivers;
  final List<AdminRecentUser> recentUsers;
  final List<AdminRecentOrder> recentOrders;

  const AdminDashboardStats({
    required this.totalUsers,
    required this.activeUsers,
    required this.suspendedUsers,
    required this.usersByRole,
    required this.totalOrders,
    required this.completedOrders,
    required this.activeOrders,
    required this.cancelledOrders,
    required this.totalRevenue,
    required this.totalProviders,
    required this.activeProviders,
    required this.totalDrivers,
    required this.activeDrivers,
    required this.onlineDrivers,
    required this.recentUsers,
    required this.recentOrders,
  });

  factory AdminDashboardStats.empty() {
    return const AdminDashboardStats(
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      usersByRole: AdminUsersByRole(customer: 0, admin: 0, provider: 0, delivery: 0),
      totalOrders: 0,
      completedOrders: 0,
      activeOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0.0,
      totalProviders: 0,
      activeProviders: 0,
      totalDrivers: 0,
      activeDrivers: 0,
      onlineDrivers: 0,
      recentUsers: [],
      recentOrders: [],
    );
  }

  factory AdminDashboardStats.fromJson(Map<String, dynamic> json) {
    return AdminDashboardStats(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      activeUsers: (json['activeUsers'] as num?)?.toInt() ?? 0,
      suspendedUsers: (json['suspendedUsers'] as num?)?.toInt() ?? 0,
      usersByRole: AdminUsersByRole.fromJson(
        json['usersByRole'] as Map<String, dynamic>? ?? {},
      ),
      totalOrders: (json['totalOrders'] as num?)?.toInt() ?? 0,
      completedOrders: (json['completedOrders'] as num?)?.toInt() ?? 0,
      activeOrders: (json['activeOrders'] as num?)?.toInt() ?? 0,
      cancelledOrders: (json['cancelledOrders'] as num?)?.toInt() ?? 0,
      totalRevenue: (json['totalRevenue'] is num)
          ? (json['totalRevenue'] as num).toDouble()
          : double.tryParse(json['totalRevenue']?.toString() ?? '0.0') ?? 0.0,
      totalProviders: (json['totalProviders'] as num?)?.toInt() ?? 0,
      activeProviders: (json['activeProviders'] as num?)?.toInt() ?? 0,
      totalDrivers: (json['totalDrivers'] as num?)?.toInt() ?? 0,
      activeDrivers: (json['activeDrivers'] as num?)?.toInt() ?? 0,
      onlineDrivers: (json['onlineDrivers'] as num?)?.toInt() ?? 0,
      recentUsers: (json['recentUsers'] as List<dynamic>?)
              ?.map((u) => AdminRecentUser.fromJson(u as Map<String, dynamic>))
              .toList() ??
          [],
      recentOrders: (json['recentOrders'] as List<dynamic>?)
              ?.map((o) => AdminRecentOrder.fromJson(o as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

@immutable
class AdminUsersByRole {
  final int customer;
  final int admin;
  final int provider;
  final int delivery;

  const AdminUsersByRole({
    required this.customer,
    required this.admin,
    required this.provider,
    required this.delivery,
  });

  factory AdminUsersByRole.fromJson(Map<String, dynamic> json) {
    return AdminUsersByRole(
      customer: (json['customer'] as num?)?.toInt() ?? 0,
      admin: (json['admin'] as num?)?.toInt() ?? 0,
      provider: (json['provider'] as num?)?.toInt() ?? 0,
      delivery: (json['delivery'] as num?)?.toInt() ?? 0,
    );
  }
}

@immutable
class AdminRecentUser {
  final String id;
  final String phoneNumber;
  final String? name;
  final String role;
  final bool isSuspended;
  final DateTime createdAt;

  const AdminRecentUser({
    required this.id,
    required this.phoneNumber,
    this.name,
    required this.role,
    required this.isSuspended,
    required this.createdAt,
  });

  factory AdminRecentUser.fromJson(Map<String, dynamic> json) {
    return AdminRecentUser(
      id: json['id'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      name: json['name'] as String?,
      role: json['role'] as String? ?? 'customer',
      isSuspended: json['isSuspended'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

@immutable
class AdminRecentOrder {
  final String id;
  final String? customerName;
  final String? customerPhone;
  final String? deliveryArea;
  final String status;
  final double totalAmount;
  final DateTime createdAt;

  const AdminRecentOrder({
    required this.id,
    this.customerName,
    this.customerPhone,
    this.deliveryArea,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
  });

  factory AdminRecentOrder.fromJson(Map<String, dynamic> json) {
    return AdminRecentOrder(
      id: json['id'] as String? ?? '',
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      deliveryArea: json['deliveryArea'] as String?,
      status: json['status'] as String? ?? 'pending',
      totalAmount: (json['totalAmount'] is num)
          ? (json['totalAmount'] as num).toDouble()
          : double.tryParse(json['totalAmount']?.toString() ?? '0.0') ?? 0.0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

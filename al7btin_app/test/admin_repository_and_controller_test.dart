import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/features/auth/domain/entities/user_entity.dart';
import 'package:al7btin_app/features/admin/domain/entities/admin_dashboard_stats.dart';
import 'package:al7btin_app/features/admin/domain/entities/admin_paginated_users.dart';
import 'package:al7btin_app/features/admin/domain/repositories/admin_repository_interface.dart';
import 'package:al7btin_app/features/admin/presentation/controllers/admin_users_controller.dart';

class FakeAdminRepository implements IAdminRepository {
  List<UserEntity> mockUsers = [
    UserEntity(
      id: 'usr_1',
      phoneNumber: '0790000001',
      name: 'أحمد المجالي',
      email: 'ahmad@test.com',
      role: UserRole.customer,
      walletBalance: 25.0,
      points: 100,
      isSuspended: false,
      createdAt: DateTime.now(),
    ),
    UserEntity(
      id: 'usr_2',
      phoneNumber: '0790000002',
      name: 'سارة خالد',
      email: 'sara@test.com',
      role: UserRole.admin,
      walletBalance: 0.0,
      points: 0,
      isSuspended: false,
      createdAt: DateTime.now(),
    ),
    UserEntity(
      id: 'usr_3',
      phoneNumber: '0790000003',
      name: 'سائق معتمد',
      email: 'driver@test.com',
      role: UserRole.delivery,
      walletBalance: 10.0,
      points: 50,
      isSuspended: true,
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<AdminPaginatedUsers> getUsers({
    int page = 1,
    int limit = 20,
    String? search,
    String? role,
    String? status,
  }) async {
    var filtered = List<UserEntity>.from(mockUsers);

    if (search != null && search.isNotEmpty) {
      filtered = filtered
          .where((u) =>
              (u.name?.contains(search) ?? false) ||
              u.phoneNumber.contains(search) ||
              (u.email?.contains(search) ?? false))
          .toList();
    }

    if (role != null && role != 'all') {
      filtered = filtered.where((u) => u.role.toBackendString() == role).toList();
    }

    if (status != null && status != 'all') {
      if (status == 'active') {
        filtered = filtered.where((u) => !u.isSuspended).toList();
      } else if (status == 'suspended') {
        filtered = filtered.where((u) => u.isSuspended).toList();
      }
    }

    return AdminPaginatedUsers(
      users: filtered,
      total: filtered.length,
      page: page,
      limit: limit,
      totalPages: 1,
    );
  }

  @override
  Future<UserEntity> getUserById(String id) async {
    final user = mockUsers.firstWhere((u) => u.id == id);
    return user;
  }

  @override
  Future<UserEntity> createUser({
    required String phoneNumber,
    String? name,
    String? email,
    String role = 'customer',
  }) async {
    final newUser = UserEntity(
      id: 'usr_${mockUsers.length + 1}',
      phoneNumber: phoneNumber,
      name: name,
      email: email,
      role: UserRole.fromString(role),
      walletBalance: 0.0,
      points: 0,
      isSuspended: false,
      createdAt: DateTime.now(),
    );
    mockUsers.add(newUser);
    return newUser;
  }

  @override
  Future<UserEntity> updateUser({
    required String id,
    String? name,
    String? email,
    String? role,
    bool? isSuspended,
  }) async {
    final index = mockUsers.indexWhere((u) => u.id == id);
    if (index == -1) throw Exception('User not found');
    final existing = mockUsers[index];
    final updated = existing.copyWith(
      name: name ?? existing.name,
      email: email ?? existing.email,
      role: role != null ? UserRole.fromString(role) : existing.role,
      isSuspended: isSuspended ?? existing.isSuspended,
    );
    mockUsers[index] = updated;
    return updated;
  }

  @override
  Future<void> suspendUser(String id) async {
    final index = mockUsers.indexWhere((u) => u.id == id);
    if (index != -1) {
      mockUsers[index] = mockUsers[index].copyWith(isSuspended: true);
    }
  }

  @override
  Future<void> activateUser(String id) async {
    final index = mockUsers.indexWhere((u) => u.id == id);
    if (index != -1) {
      mockUsers[index] = mockUsers[index].copyWith(isSuspended: false);
    }
  }

  @override
  Future<AdminDashboardStats> getDashboardStats() async {
    return AdminDashboardStats(
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.where((u) => !u.isSuspended).length,
      suspendedUsers: mockUsers.where((u) => u.isSuspended).length,
      usersByRole: AdminUsersByRole(
        customer: mockUsers.where((u) => u.role == UserRole.customer).length,
        admin: mockUsers.where((u) => u.role == UserRole.admin).length,
        provider: mockUsers.where((u) => u.role == UserRole.provider).length,
        delivery: mockUsers.where((u) => u.role == UserRole.delivery).length,
      ),
      totalOrders: 12,
      completedOrders: 10,
      activeOrders: 2,
      cancelledOrders: 0,
      totalRevenue: 250.0,
      totalProviders: 3,
      activeProviders: 3,
      totalDrivers: 2,
      activeDrivers: 2,
      onlineDrivers: 1,
      recentUsers: const [],
      recentOrders: const [],
    );
  }
}

void main() {
  group('👑 Admin Users Controller & Live Stats Tests', () {
    late FakeAdminRepository repository;
    late AdminUsersController controller;

    setUp(() {
      repository = FakeAdminRepository();
      controller = AdminUsersController(repository);
    });

    test('1. Loads initial paginated users from repository', () async {
      await controller.loadUsers();
      expect(controller.state.users.length, 3);
      expect(controller.state.totalCount, 3);
      expect(controller.state.isLoading, false);
      expect(controller.state.errorMessage, isNull);
    });

    test('2. Filters users by role (customer)', () async {
      controller.setRoleFilter('customer');
      await controller.loadUsers();
      expect(controller.state.users.length, 1);
      expect(controller.state.users.first.name, 'أحمد المجالي');
      expect(controller.state.users.first.role, UserRole.customer);
    });

    test('3. Filters users by status (suspended)', () async {
      controller.setStatusFilter('suspended');
      await controller.loadUsers();
      expect(controller.state.users.length, 1);
      expect(controller.state.users.first.id, 'usr_3');
      expect(controller.state.users.first.isSuspended, true);
    });

    test('4. Searches users by name query', () async {
      controller.setSearch('سارة');
      await controller.loadUsers();
      expect(controller.state.users.length, 1);
      expect(controller.state.users.first.name, 'سارة خالد');
    });

    test('5. Toggles user suspension state', () async {
      await controller.loadUsers();
      // Initially usr_1 is not suspended
      expect(controller.state.users.first.isSuspended, false);

      await controller.toggleUserSuspension('usr_1');
      expect(controller.state.users.first.isSuspended, true);

      await controller.toggleUserSuspension('usr_1');
      expect(controller.state.users.first.isSuspended, false);
    });

    test('6. Updates user details and role in state', () async {
      await controller.loadUsers();
      await controller.updateUser(
        id: 'usr_1',
        name: 'أحمد المجالي المحدث',
        role: 'admin',
      );

      final updated = controller.state.users.firstWhere((u) => u.id == 'usr_1');
      expect(updated.name, 'أحمد المجالي المحدث');
      expect(updated.role, UserRole.admin);
    });

    test('7. AdminDashboardStats serialization and parsing', () {
      final json = {
        'totalUsers': 50,
        'activeUsers': 45,
        'suspendedUsers': 5,
        'usersByRole': {'customer': 40, 'admin': 2, 'provider': 5, 'delivery': 3},
        'totalOrders': 120,
        'completedOrders': 110,
        'activeOrders': 8,
        'cancelledOrders': 2,
        'totalRevenue': '1580.50',
        'totalProviders': 4,
        'activeProviders': 4,
        'totalDrivers': 6,
        'activeDrivers': 5,
        'onlineDrivers': 4,
        'recentUsers': [
          {
            'id': 'usr_99',
            'phoneNumber': '0799990000',
            'name': 'عميل جديد',
            'role': 'customer',
            'isSuspended': false,
            'createdAt': '2026-09-08T20:00:00.000Z'
          }
        ],
        'recentOrders': [
          {
            'id': 'ORD-101',
            'customerName': 'أحمد',
            'status': 'completed',
            'totalAmount': '12.50',
            'createdAt': '2026-09-08T20:00:00.000Z'
          }
        ]
      };

      final stats = AdminDashboardStats.fromJson(json);
      expect(stats.totalUsers, 50);
      expect(stats.activeUsers, 45);
      expect(stats.suspendedUsers, 5);
      expect(stats.usersByRole.customer, 40);
      expect(stats.totalRevenue, 1580.50);
      expect(stats.recentUsers.length, 1);
      expect(stats.recentUsers.first.name, 'عميل جديد');
      expect(stats.recentOrders.first.totalAmount, 12.50);
    });
  });
}

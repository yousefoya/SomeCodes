import '../../../auth/domain/entities/user_entity.dart';
import '../entities/admin_dashboard_stats.dart';
import '../entities/admin_paginated_users.dart';

abstract class IAdminRepository {
  /// Fetches paginated list of users from PostgreSQL backend with search and filtering
  Future<AdminPaginatedUsers> getUsers({
    int page = 1,
    int limit = 20,
    String? search,
    String? role,
    String? status,
  });

  /// Fetches a single user by ID
  Future<UserEntity> getUserById(String id);

  /// Creates a new user account directly in PostgreSQL
  Future<UserEntity> createUser({
    required String phoneNumber,
    String? name,
    String? email,
    String role = 'customer',
  });

  /// Updates a user's name, email, role, or suspension state
  Future<UserEntity> updateUser({
    required String id,
    String? name,
    String? email,
    String? role,
    bool? isSuspended,
  });

  /// Suspends a user account and revokes active sessions
  Future<void> suspendUser(String id);

  /// Activates a suspended user account
  Future<void> activateUser(String id);

  /// Fetches live aggregated dashboard statistics from PostgreSQL
  Future<AdminDashboardStats> getDashboardStats();
}

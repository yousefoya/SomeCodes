import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../data/repositories/api_admin_repository.dart';
import '../../domain/repositories/admin_repository_interface.dart';

class AdminUsersState {
  final List<UserEntity> users;
  final int totalCount;
  final int page;
  final int totalPages;
  final int limit;
  final String searchQuery;
  final String roleFilter; // 'all', 'customer', 'admin', 'provider', 'delivery'
  final String statusFilter; // 'all', 'active', 'suspended'
  final bool isLoading;
  final String? errorMessage;

  const AdminUsersState({
    this.users = const [],
    this.totalCount = 0,
    this.page = 1,
    this.totalPages = 1,
    this.limit = 20,
    this.searchQuery = '',
    this.roleFilter = 'all',
    this.statusFilter = 'all',
    this.isLoading = false,
    this.errorMessage,
  });

  AdminUsersState copyWith({
    List<UserEntity>? users,
    int? totalCount,
    int? page,
    int? totalPages,
    int? limit,
    String? searchQuery,
    String? roleFilter,
    String? statusFilter,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AdminUsersState(
      users: users ?? this.users,
      totalCount: totalCount ?? this.totalCount,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      limit: limit ?? this.limit,
      searchQuery: searchQuery ?? this.searchQuery,
      roleFilter: roleFilter ?? this.roleFilter,
      statusFilter: statusFilter ?? this.statusFilter,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// StateNotifier managing real PostgreSQL users in Admin Dashboard
class AdminUsersController extends StateNotifier<AdminUsersState> {
  final IAdminRepository _repository;

  AdminUsersController(this._repository) : super(const AdminUsersState()) {
    loadUsers();
  }

  /// Fetches users with current filters, search, and pagination
  Future<void> loadUsers({int? page}) async {
    final targetPage = page ?? state.page;
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final res = await _repository.getUsers(
        page: targetPage,
        limit: state.limit,
        search: state.searchQuery.isEmpty ? null : state.searchQuery,
        role: state.roleFilter == 'all' ? null : state.roleFilter,
        status: state.statusFilter == 'all' ? null : state.statusFilter,
      );

      if (!mounted) return;
      state = state.copyWith(
        users: res.users,
        totalCount: res.total,
        page: res.page,
        totalPages: res.totalPages,
        limit: res.limit,
        isLoading: false,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  /// Updates search query and reloads
  void setSearch(String query) {
    if (state.searchQuery != query) {
      state = state.copyWith(searchQuery: query, page: 1);
      loadUsers(page: 1);
    }
  }

  /// Updates role filter and reloads
  void setRoleFilter(String role) {
    if (state.roleFilter != role) {
      state = state.copyWith(roleFilter: role, page: 1);
      loadUsers(page: 1);
    }
  }

  /// Updates status filter and reloads
  void setStatusFilter(String status) {
    if (state.statusFilter != status) {
      state = state.copyWith(statusFilter: status, page: 1);
      loadUsers(page: 1);
    }
  }

  /// Navigates to a specific page
  void setPage(int page) {
    if (page >= 1 && page <= state.totalPages && page != state.page) {
      loadUsers(page: page);
    }
  }

  /// Toggles user suspension (calls real PostgreSQL backend)
  Future<void> toggleUserSuspension(String userId) async {
    final user = state.users.where((u) => u.id == userId).firstOrNull;
    if (user == null) return;

    try {
      if (user.isSuspended) {
        await _repository.activateUser(userId);
      } else {
        await _repository.suspendUser(userId);
      }

      // Update state locally immediately
      state = state.copyWith(
        users: state.users.map((u) {
          if (u.id == userId) {
            return u.copyWith(isSuspended: !u.isSuspended);
          }
          return u;
        }).toList(),
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'فشل تعديل حالة الحساب: $e');
      rethrow;
    }
  }

  /// Updates user details in real PostgreSQL database
  Future<void> updateUser({
    required String id,
    String? name,
    String? email,
    String? role,
    bool? isSuspended,
  }) async {
    try {
      final updated = await _repository.updateUser(
        id: id,
        name: name,
        email: email,
        role: role,
        isSuspended: isSuspended,
      );

      state = state.copyWith(
        users: state.users.map((u) => u.id == id ? updated : u).toList(),
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'فشل تحديث المستخدم: $e');
      rethrow;
    }
  }
}

/// Global provider for AdminUsersController
final adminUsersControllerProvider =
    StateNotifierProvider<AdminUsersController, AdminUsersState>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminUsersController(repository);
});

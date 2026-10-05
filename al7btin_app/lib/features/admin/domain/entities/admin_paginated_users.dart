import 'package:flutter/foundation.dart';
import '../../../auth/domain/entities/user_entity.dart';

/// Paginated users response from admin endpoints
@immutable
class AdminPaginatedUsers {
  final List<UserEntity> users;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  const AdminPaginatedUsers({
    required this.users,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory AdminPaginatedUsers.empty() {
    return const AdminPaginatedUsers(
      users: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    );
  }

  factory AdminPaginatedUsers.fromJson(Map<String, dynamic> json) {
    return AdminPaginatedUsers(
      users: (json['users'] as List<dynamic>?)
              ?.map((u) => UserEntity.fromJson(u as Map<String, dynamic>))
              .toList() ??
          [],
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 1,
    );
  }
}

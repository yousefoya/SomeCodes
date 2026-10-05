import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/api_admin_repository.dart';
import '../../domain/entities/admin_dashboard_stats.dart';

/// FutureProvider that fetches live aggregated stats from PostgreSQL
final adminDashboardStatsProvider = FutureProvider.autoDispose<AdminDashboardStats>((ref) async {
  final repository = ref.watch(adminRepositoryProvider);
  return repository.getDashboardStats();
});

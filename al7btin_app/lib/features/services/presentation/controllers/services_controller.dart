import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/repositories/api_service_repository.dart';
import '../../domain/entities/service_entity.dart';
import '../../domain/repositories/service_repository_interface.dart';

/// Provider for IServiceRepository interface (connected to real backend)
final serviceRepositoryProvider = Provider<IServiceRepository>((ref) {
  final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiServiceRepository(authLocalDataSource: authLocalDataSource);
});

/// AsyncProvider fetching services, optionally filtered by categoryId from PostgreSQL backend
final servicesProvider = FutureProvider.family<List<ServiceEntity>, String?>((ref, categoryId) async {
  final repository = ref.watch(serviceRepositoryProvider);
  return repository.getServices(categoryId: categoryId);
});

/// AsyncProvider fetching a single service details by id
final serviceDetailsProvider = FutureProvider.family<ServiceEntity?, String>((ref, serviceId) async {
  final repository = ref.watch(serviceRepositoryProvider);
  return repository.getServiceById(serviceId);
});

/// State provider for search query
final serviceSearchQueryProvider = StateProvider<String>((ref) => '');

/// AsyncProvider fetching search results based on active query
final searchServicesProvider = FutureProvider<List<ServiceEntity>>((ref) async {
  final query = ref.watch(serviceSearchQueryProvider);
  final repository = ref.watch(serviceRepositoryProvider);
  if (query.trim().isEmpty) {
    return repository.getServices();
  }
  return repository.searchServices(query);
});

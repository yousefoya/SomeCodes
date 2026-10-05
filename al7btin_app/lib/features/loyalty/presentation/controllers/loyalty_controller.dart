import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/repositories/loyalty_repository.dart';
import '../../domain/entities/loyalty_entity.dart';

final loyaltyRepositoryProvider = Provider<ILoyaltyRepository>((ref) {
  final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
  return ApiLoyaltyRepository(authLocalDataSource: authLocalDataSource);
});

class LoyaltyController extends StateNotifier<AsyncValue<LoyaltyProfileEntity>> {
  final ILoyaltyRepository _repository;
  final Ref _ref;

  LoyaltyController(this._repository, this._ref) : super(const AsyncValue.loading()) {
    loadLoyalty();
  }

  Future<void> loadLoyalty() async {
    final authState = _ref.read(authControllerProvider);
    if (!authState.isAuthenticated) {
      state = const AsyncValue.data(
        LoyaltyProfileEntity(
          points: 0,
          totalEarned: 0,
          isEligibleForReward: false,
          requiredPointsForReward: 200,
          rewardValue: 5.0,
        ),
      );
      return;
    }

    state = const AsyncValue.loading();
    try {
      final profile = await _repository.getMyLoyalty();
      state = AsyncValue.data(profile);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<Map<String, dynamic>> redeemReward() async {
    final res = await _repository.redeemReward();
    await loadLoyalty();
    return res;
  }
}

final loyaltyControllerProvider =
    StateNotifierProvider<LoyaltyController, AsyncValue<LoyaltyProfileEntity>>((ref) {
  final repository = ref.watch(loyaltyRepositoryProvider);
  return LoyaltyController(repository, ref);
});

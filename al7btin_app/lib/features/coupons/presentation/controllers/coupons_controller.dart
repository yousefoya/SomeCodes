import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/api_coupon_repository.dart';
import '../../domain/entities/coupon_entity.dart';

final couponRepositoryProvider = Provider<ApiCouponRepository>((ref) {
  return ApiCouponRepository();
});

/// StateNotifier managing dynamic coupons (Admin CRUD & Customer checkout validation)
class CouponsController extends StateNotifier<List<CouponEntity>> {
  final ApiCouponRepository _repository;

  CouponsController([ApiCouponRepository? repository])
      : _repository = repository ?? ApiCouponRepository(),
        super([]) {
    loadCoupons();
  }

  /// Loads real active coupons from backend
  Future<void> loadCoupons() async {
    try {
      final list = await _repository.fetchPublicCoupons();
      state = list;
    } catch (_) {}
  }

  /// Finds and validates a coupon code locally
  CouponEntity? findValidCoupon(String code, double subtotal) {
    final cleanCode = code.trim().toUpperCase();
    try {
      final coupon = state.firstWhere((c) => c.code.toUpperCase() == cleanCode && c.isActive);
      if (coupon.calculateDiscount(subtotal) > 0) {
        return coupon;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Validate coupon via live backend API
  Future<CouponValidationResult> validateWithBackend(String code, double subtotal) async {
    final result = await _repository.validateCoupon(code, subtotal);
    if (result.isValid && result.coupon != null) {
      // Refresh local state if newly discovered
      if (!state.any((c) => c.code == result.coupon!.code)) {
        state = [result.coupon!, ...state];
      }
    }
    return result;
  }

  /// Adds a new coupon (Admin action)
  Future<CouponEntity?> addCoupon({
    required String code,
    required CouponType type,
    required double value,
    double minOrderValue = 0.0,
    DateTime? expiryDate,
    int usageLimit = 1000,
    String? token,
  }) async {
    final cleanCode = code.trim().toUpperCase();
    final newCoupon = CouponEntity(
      id: 'CPN-${DateTime.now().millisecondsSinceEpoch}',
      code: cleanCode,
      type: type,
      value: value,
      minOrderValue: minOrderValue,
      expiryDate: expiryDate,
      usageLimit: usageLimit,
      isActive: true,
      createdAt: DateTime.now(),
    );

    if (token != null && token.isNotEmpty) {
      final created = await _repository.createAdminCoupon({
        'code': cleanCode,
        'type': type == CouponType.fixedAmount ? 'fixed_amount' : 'percentage',
        'value': value,
        'minOrderValue': minOrderValue,
        'expiryDate': expiryDate?.toIso8601String(),
        'usageLimit': usageLimit,
        'isActive': true,
      }, token);

      if (created != null) {
        state = [created, ...state.where((c) => c.id != created.id)];
        return created;
      }
    }

    state = [newCoupon, ...state];
    return newCoupon;
  }

  /// Updates an existing coupon (Admin action)
  Future<void> updateCoupon(CouponEntity updatedCoupon, {String? token}) async {
    state = state.map((c) => c.id == updatedCoupon.id ? updatedCoupon : c).toList();

    if (token != null && token.isNotEmpty) {
      await _repository.updateAdminCoupon(updatedCoupon.id, updatedCoupon.toJson(), token);
    }
  }

  /// Toggles active status of a coupon (Admin action)
  Future<void> toggleCouponStatus(String couponId, {String? token}) async {
    CouponEntity? toggled;
    state = state.map((c) {
      if (c.id == couponId) {
        toggled = c.copyWith(isActive: !c.isActive);
        return toggled!;
      }
      return c;
    }).toList();

    if (token != null && token.isNotEmpty && toggled != null) {
      await _repository.updateAdminCoupon(couponId, {'isActive': toggled!.isActive}, token);
    }
  }

  /// Deletes a coupon (Admin action)
  Future<void> deleteCoupon(String couponId, {String? token}) async {
    state = state.where((c) => c.id != couponId).toList();

    if (token != null && token.isNotEmpty) {
      await _repository.deleteAdminCoupon(couponId, token);
    }
  }
}

/// Global provider for CouponsController
final couponsControllerProvider = StateNotifierProvider<CouponsController, List<CouponEntity>>((ref) {
  final repository = ref.watch(couponRepositoryProvider);
  return CouponsController(repository);
});

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/offer_entity.dart';

/// StateNotifier managing dynamic promotional offers (Admin CRUD & Customer Home display)
class OffersController extends StateNotifier<List<OfferEntity>> {
  OffersController() : super(const []);

  /// Adds a new offer (Admin action)
  void addOffer({
    required String titleAr,
    required String titleEn,
    required String descriptionAr,
    required String descriptionEn,
    required double discountPercentage,
    String? promoCode,
    required DateTime startDate,
    required DateTime endDate,
  }) {
    final newOffer = OfferEntity(
      id: 'OFFER-${DateTime.now().millisecondsSinceEpoch}',
      titleAr: titleAr,
      titleEn: titleEn,
      descriptionAr: descriptionAr,
      descriptionEn: descriptionEn,
      discountPercentage: discountPercentage,
      promoCode: promoCode,
      startDate: startDate,
      endDate: endDate,
      isActive: true,
    );
    state = [newOffer, ...state];
  }

  /// Updates an offer (Admin action)
  void updateOffer(OfferEntity updatedOffer) {
    state = state.map((o) => o.id == updatedOffer.id ? updatedOffer : o).toList();
  }

  /// Toggles offer active state (Admin action)
  void toggleOfferStatus(String offerId) {
    state = state.map((o) {
      if (o.id == offerId) {
        return o.copyWith(isActive: !o.isActive);
      }
      return o;
    }).toList();
  }

  /// Deletes an offer (Admin action)
  void deleteOffer(String offerId) {
    state = state.where((o) => o.id != offerId).toList();
  }
}

/// Global provider for OffersController
final offersControllerProvider = StateNotifierProvider<OffersController, List<OfferEntity>>((ref) {
  return OffersController();
});

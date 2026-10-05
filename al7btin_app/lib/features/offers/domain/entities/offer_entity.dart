/// Dynamic Promotional Offer entity displayed on Customer Home and managed by Admin
class OfferEntity {
  final String id;
  final String titleAr;
  final String titleEn;
  final String descriptionAr;
  final String descriptionEn;
  final double discountPercentage;
  final String? promoCode;
  final DateTime startDate;
  final DateTime endDate;
  final bool isActive;
  final String? bannerColor;

  const OfferEntity({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    required this.descriptionAr,
    required this.descriptionEn,
    required this.discountPercentage,
    this.promoCode,
    required this.startDate,
    required this.endDate,
    this.isActive = true,
    this.bannerColor,
  });

  bool get isCurrentlyValid {
    if (!isActive) return false;
    final now = DateTime.now();
    return now.isAfter(startDate) && now.isBefore(endDate);
  }

  OfferEntity copyWith({
    String? id,
    String? titleAr,
    String? titleEn,
    String? descriptionAr,
    String? descriptionEn,
    double? discountPercentage,
    String? promoCode,
    DateTime? startDate,
    DateTime? endDate,
    bool? isActive,
    String? bannerColor,
  }) {
    return OfferEntity(
      id: id ?? this.id,
      titleAr: titleAr ?? this.titleAr,
      titleEn: titleEn ?? this.titleEn,
      descriptionAr: descriptionAr ?? this.descriptionAr,
      descriptionEn: descriptionEn ?? this.descriptionEn,
      discountPercentage: discountPercentage ?? this.discountPercentage,
      promoCode: promoCode ?? this.promoCode,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isActive: isActive ?? this.isActive,
      bannerColor: bannerColor ?? this.bannerColor,
    );
  }
}

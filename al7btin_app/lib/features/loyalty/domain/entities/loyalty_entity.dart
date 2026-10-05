class LoyaltyTransactionEntity {
  final String id;
  final String? orderId;
  final String type;
  final int points;
  final String? description;
  final DateTime createdAt;

  const LoyaltyTransactionEntity({
    required this.id,
    this.orderId,
    required this.type,
    required this.points,
    this.description,
    required this.createdAt,
  });

  factory LoyaltyTransactionEntity.fromJson(Map<String, dynamic> json) {
    return LoyaltyTransactionEntity(
      id: json['id'] as String? ?? '',
      orderId: json['orderId'] as String?,
      type: json['type'] as String? ?? 'order_reward',
      points: (json['points'] is num) ? (json['points'] as num).toInt() : 0,
      description: json['description'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class LoyaltyProfileEntity {
  final int points;
  final int totalEarned;
  final bool isEligibleForReward;
  final int requiredPointsForReward;
  final String rewardType;
  final double rewardValue;
  final String rewardTitleAr;
  final String rewardTitleEn;
  final bool isRewardActive;
  final List<LoyaltyTransactionEntity> transactions;

  const LoyaltyProfileEntity({
    required this.points,
    required this.totalEarned,
    required this.isEligibleForReward,
    required this.requiredPointsForReward,
    this.rewardType = 'coupon',
    this.rewardValue = 5.0,
    this.rewardTitleAr = 'خصم 5 د.أ مقابل 200 نقطة ولاء',
    this.rewardTitleEn = '5 JOD Discount for 200 Loyalty Points',
    this.isRewardActive = true,
    this.transactions = const [],
  });

  factory LoyaltyProfileEntity.fromJson(Map<String, dynamic> json) {
    final txList = (json['transactions'] as List<dynamic>? ?? [])
        .map((t) => LoyaltyTransactionEntity.fromJson(t as Map<String, dynamic>))
        .toList();

    return LoyaltyProfileEntity(
      points: (json['points'] is num) ? (json['points'] as num).toInt() : 0,
      totalEarned: (json['totalEarned'] is num) ? (json['totalEarned'] as num).toInt() : 0,
      isEligibleForReward: json['isEligibleForReward'] as bool? ?? false,
      requiredPointsForReward: (json['requiredPointsForReward'] is num)
          ? (json['requiredPointsForReward'] as num).toInt()
          : 200,
      rewardType: json['rewardType'] as String? ?? 'coupon',
      rewardValue: (json['rewardValue'] is num)
          ? (json['rewardValue'] as num).toDouble()
          : double.tryParse(json['rewardValue']?.toString() ?? '5.0') ?? 5.0,
      rewardTitleAr: json['rewardTitleAr'] as String? ?? 'خصم 5 د.أ مقابل 200 نقطة ولاء',
      rewardTitleEn: json['rewardTitleEn'] as String? ?? '5 JOD Discount for 200 Loyalty Points',
      isRewardActive: json['isRewardActive'] as bool? ?? true,
      transactions: txList,
    );
  }
}

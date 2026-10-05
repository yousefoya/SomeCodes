class ProviderWalletEntity {
  final String id;
  final String providerId;
  final String? providerNameAr;
  final String? providerNameEn;
  final double availableBalance;
  final double pendingBalance;
  final double heldBalance;
  final double totalEarned;
  final double totalWithdrawn;
  final double totalCommission;
  final double totalRefunded;
  final double liabilityBalance;
  final String currency;
  final String status;
  final DateTime? lastReconciledAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ProviderWalletEntity({
    required this.id,
    required this.providerId,
    this.providerNameAr,
    this.providerNameEn,
    required this.availableBalance,
    required this.pendingBalance,
    required this.heldBalance,
    required this.totalEarned,
    required this.totalWithdrawn,
    required this.totalCommission,
    required this.totalRefunded,
    required this.liabilityBalance,
    this.currency = 'JOD',
    this.status = 'active',
    this.lastReconciledAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProviderWalletEntity.fromJson(Map<String, dynamic> json) {
    return ProviderWalletEntity(
      id: json['id']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      providerNameAr: json['providerNameAr']?.toString(),
      providerNameEn: json['providerNameEn']?.toString(),
      availableBalance: (json['availableBalance'] as num?)?.toDouble() ?? 0.0,
      pendingBalance: (json['pendingBalance'] as num?)?.toDouble() ?? 0.0,
      heldBalance: (json['heldBalance'] as num?)?.toDouble() ?? 0.0,
      totalEarned: (json['totalEarned'] as num?)?.toDouble() ?? 0.0,
      totalWithdrawn: (json['totalWithdrawn'] as num?)?.toDouble() ?? 0.0,
      totalCommission: (json['totalCommission'] as num?)?.toDouble() ?? 0.0,
      totalRefunded: (json['totalRefunded'] as num?)?.toDouble() ?? 0.0,
      liabilityBalance: (json['liabilityBalance'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency']?.toString() ?? 'JOD',
      status: json['status']?.toString() ?? 'active',
      lastReconciledAt: json['lastReconciledAt'] != null
          ? DateTime.tryParse(json['lastReconciledAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'providerNameAr': providerNameAr,
      'providerNameEn': providerNameEn,
      'availableBalance': availableBalance,
      'pendingBalance': pendingBalance,
      'heldBalance': heldBalance,
      'totalEarned': totalEarned,
      'totalWithdrawn': totalWithdrawn,
      'totalCommission': totalCommission,
      'totalRefunded': totalRefunded,
      'liabilityBalance': liabilityBalance,
      'currency': currency,
      'status': status,
      'lastReconciledAt': lastReconciledAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

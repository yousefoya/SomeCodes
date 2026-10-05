class WalletTransactionEntity {
  final String id;
  final String transactionNumber;
  final String walletId;
  final String providerId;
  final String? providerNameAr;
  final String? providerNameEn;
  final String type;
  final String direction; // credit | debit
  final double amount;
  final double balanceBefore;
  final double balanceAfter;
  final String referenceType;
  final String referenceId;
  final String descriptionAr;
  final String descriptionEn;
  final String status;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;

  const WalletTransactionEntity({
    required this.id,
    required this.transactionNumber,
    required this.walletId,
    required this.providerId,
    this.providerNameAr,
    this.providerNameEn,
    required this.type,
    required this.direction,
    required this.amount,
    required this.balanceBefore,
    required this.balanceAfter,
    required this.referenceType,
    required this.referenceId,
    required this.descriptionAr,
    required this.descriptionEn,
    this.status = 'settled',
    this.metadata,
    required this.createdAt,
  });

  factory WalletTransactionEntity.fromJson(Map<String, dynamic> json) {
    return WalletTransactionEntity(
      id: json['id']?.toString() ?? '',
      transactionNumber: json['transactionNumber']?.toString() ?? '',
      walletId: json['walletId']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      providerNameAr: json['providerNameAr']?.toString(),
      providerNameEn: json['providerNameEn']?.toString(),
      type: json['type']?.toString() ?? 'CREDIT_ORDER_PAYMENT',
      direction: json['direction']?.toString() ?? 'credit',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balanceBefore: (json['balanceBefore'] as num?)?.toDouble() ?? 0.0,
      balanceAfter: (json['balanceAfter'] as num?)?.toDouble() ?? 0.0,
      referenceType: json['referenceType']?.toString() ?? 'order',
      referenceId: json['referenceId']?.toString() ?? '',
      descriptionAr: json['descriptionAr']?.toString() ?? '',
      descriptionEn: json['descriptionEn']?.toString() ?? '',
      status: json['status']?.toString() ?? 'settled',
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'transactionNumber': transactionNumber,
      'walletId': walletId,
      'providerId': providerId,
      'providerNameAr': providerNameAr,
      'providerNameEn': providerNameEn,
      'type': type,
      'direction': direction,
      'amount': amount,
      'balanceBefore': balanceBefore,
      'balanceAfter': balanceAfter,
      'referenceType': referenceType,
      'referenceId': referenceId,
      'descriptionAr': descriptionAr,
      'descriptionEn': descriptionEn,
      'status': status,
      'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class WithdrawalRequestEntity {
  final String id;
  final String withdrawalNumber;
  final String providerId;
  final String? bankAccountId;
  final double amount;
  final String currency;
  final String status;
  final String bankName;
  final String beneficiaryName;
  final String iban;
  final String? rejectionReason;
  final String? transactionReference;
  final DateTime? approvedAt;
  final DateTime? paidAt;
  final DateTime createdAt;

  const WithdrawalRequestEntity({
    required this.id,
    required this.withdrawalNumber,
    required this.providerId,
    this.bankAccountId,
    required this.amount,
    this.currency = 'JOD',
    required this.status,
    required this.bankName,
    required this.beneficiaryName,
    required this.iban,
    this.rejectionReason,
    this.transactionReference,
    this.approvedAt,
    this.paidAt,
    required this.createdAt,
  });

  factory WithdrawalRequestEntity.fromJson(Map<String, dynamic> json) {
    return WithdrawalRequestEntity(
      id: json['id']?.toString() ?? '',
      withdrawalNumber: json['withdrawalNumber']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      bankAccountId: json['bankAccountId']?.toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency']?.toString() ?? 'JOD',
      status: json['status']?.toString() ?? 'requested',
      bankName: json['bankName']?.toString() ?? '',
      beneficiaryName: json['beneficiaryName']?.toString() ?? '',
      iban: json['iban']?.toString() ?? '',
      rejectionReason: json['rejectionReason']?.toString(),
      transactionReference: json['transactionReference']?.toString(),
      approvedAt: json['approvedAt'] != null
          ? DateTime.tryParse(json['approvedAt'].toString())
          : null,
      paidAt: json['paidAt'] != null
          ? DateTime.tryParse(json['paidAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'withdrawalNumber': withdrawalNumber,
      'providerId': providerId,
      'bankAccountId': bankAccountId,
      'amount': amount,
      'currency': currency,
      'status': status,
      'bankName': bankName,
      'beneficiaryName': beneficiaryName,
      'iban': iban,
      'rejectionReason': rejectionReason,
      'transactionReference': transactionReference,
      'approvedAt': approvedAt?.toIso8601String(),
      'paidAt': paidAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

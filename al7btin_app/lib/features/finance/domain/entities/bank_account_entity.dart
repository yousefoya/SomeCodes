class BankAccountEntity {
  final String id;
  final String providerId;
  final String bankName;
  final String beneficiaryName;
  final String iban;
  final String? swiftCode;
  final bool isDefault;
  final bool isVerified;
  final DateTime createdAt;

  const BankAccountEntity({
    required this.id,
    required this.providerId,
    required this.bankName,
    required this.beneficiaryName,
    required this.iban,
    this.swiftCode,
    this.isDefault = true,
    this.isVerified = true,
    required this.createdAt,
  });

  factory BankAccountEntity.fromJson(Map<String, dynamic> json) {
    return BankAccountEntity(
      id: json['id']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      bankName: json['bankName']?.toString() ?? '',
      beneficiaryName: json['beneficiaryName']?.toString() ?? '',
      iban: json['iban']?.toString() ?? '',
      swiftCode: json['swiftCode']?.toString(),
      isDefault: json['isDefault'] == true,
      isVerified: json['isVerified'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'bankName': bankName,
      'beneficiaryName': beneficiaryName,
      'iban': iban,
      'swiftCode': swiftCode,
      'isDefault': isDefault,
      'isVerified': isVerified,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

import '../entities/provider_wallet_entity.dart';
import '../entities/wallet_transaction_entity.dart';
import '../entities/bank_account_entity.dart';
import '../entities/withdrawal_request_entity.dart';

abstract class IFinanceRepository {
  /// Fetch the authenticated provider's wallet summary
  Future<ProviderWalletEntity> getMyWallet();

  /// Fetch the authenticated provider's transaction history
  Future<List<WalletTransactionEntity>> getMyTransactions({String? type, int limit = 50});

  /// Fetch the authenticated provider's bank accounts
  Future<List<BankAccountEntity>> getMyBankAccounts();

  /// Add a new Jordanian bank account
  Future<BankAccountEntity> addBankAccount({
    required String bankName,
    required String beneficiaryName,
    required String iban,
    String? swiftCode,
    bool isDefault = true,
  });

  /// Delete a bank account
  Future<void> deleteBankAccount(String accountId);

  /// Fetch the authenticated provider's withdrawal requests
  Future<List<WithdrawalRequestEntity>> getMyWithdrawals();

  /// Request a new withdrawal
  Future<WithdrawalRequestEntity> requestWithdrawal({
    required double amount,
    String? bankAccountId,
    String? bankName,
    String? beneficiaryName,
    String? iban,
  });
}

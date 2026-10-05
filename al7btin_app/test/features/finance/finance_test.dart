import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/features/finance/domain/entities/provider_wallet_entity.dart';
import 'package:al7btin_app/features/finance/domain/entities/wallet_transaction_entity.dart';
import 'package:al7btin_app/features/finance/domain/entities/bank_account_entity.dart';
import 'package:al7btin_app/features/finance/domain/entities/withdrawal_request_entity.dart';
import 'package:al7btin_app/features/finance/domain/repositories/finance_repository_interface.dart';
import 'package:al7btin_app/features/finance/presentation/controllers/provider_wallet_controller.dart';

class MockFinanceRepository implements IFinanceRepository {
  ProviderWalletEntity mockWallet = ProviderWalletEntity(
    id: 'w_001',
    providerId: 'p_001',
    availableBalance: 150.75,
    pendingBalance: 25.00,
    heldBalance: 50.00,
    totalEarned: 500.00,
    totalWithdrawn: 300.00,
    totalCommission: 75.00,
    totalRefunded: 0.00,
    liabilityBalance: 0.00,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  List<WalletTransactionEntity> mockTransactions = [
    WalletTransactionEntity(
      id: 'tx_001',
      transactionNumber: 'TX-2026-0001',
      walletId: 'w_001',
      providerId: 'p_001',
      type: 'CREDIT_ORDER_PAYMENT',
      direction: 'credit',
      amount: 45.00,
      balanceBefore: 105.75,
      balanceAfter: 150.75,
      referenceType: 'order',
      referenceId: 'ORD-123456',
      descriptionAr: 'أرباح الطلب رقم ORD-123456',
      descriptionEn: 'Order earnings ORD-123456',
      createdAt: DateTime.now(),
    ),
  ];

  List<BankAccountEntity> mockBankAccounts = [
    BankAccountEntity(
      id: 'acc_001',
      providerId: 'p_001',
      bankName: 'بنك الاتحاد',
      beneficiaryName: 'شركة الوكالة للغاز',
      iban: 'JO94UBSI1030000123456789012345',
      isDefault: true,
      isVerified: true,
      createdAt: DateTime.now(),
    ),
  ];

  List<WithdrawalRequestEntity> mockWithdrawals = [
    WithdrawalRequestEntity(
      id: 'wth_001',
      withdrawalNumber: 'WTH-2026-0001',
      providerId: 'p_001',
      amount: 50.00,
      status: 'requested',
      bankName: 'بنك الاتحاد',
      beneficiaryName: 'شركة الوكالة للغاز',
      iban: 'JO94UBSI1030000123456789012345',
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<ProviderWalletEntity> getMyWallet() async => mockWallet;

  @override
  Future<List<WalletTransactionEntity>> getMyTransactions({String? type, int limit = 50}) async {
    if (type != null) {
      return mockTransactions.where((tx) => tx.type == type).toList();
    }
    return mockTransactions;
  }

  @override
  Future<List<BankAccountEntity>> getMyBankAccounts() async => mockBankAccounts;

  @override
  Future<BankAccountEntity> addBankAccount({
    required String bankName,
    required String beneficiaryName,
    required String iban,
    String? swiftCode,
    bool isDefault = true,
  }) async {
    final acc = BankAccountEntity(
      id: 'acc_new',
      providerId: 'p_001',
      bankName: bankName,
      beneficiaryName: beneficiaryName,
      iban: iban,
      swiftCode: swiftCode,
      isDefault: isDefault,
      isVerified: true,
      createdAt: DateTime.now(),
    );
    mockBankAccounts.add(acc);
    return acc;
  }

  @override
  Future<void> deleteBankAccount(String accountId) async {
    mockBankAccounts.removeWhere((a) => a.id == accountId);
  }

  @override
  Future<List<WithdrawalRequestEntity>> getMyWithdrawals() async => mockWithdrawals;

  @override
  Future<WithdrawalRequestEntity> requestWithdrawal({
    required double amount,
    String? bankAccountId,
    String? bankName,
    String? beneficiaryName,
    String? iban,
  }) async {
    final wth = WithdrawalRequestEntity(
      id: 'wth_new',
      withdrawalNumber: 'WTH-2026-0002',
      providerId: 'p_001',
      amount: amount,
      status: 'requested',
      bankName: bankName ?? 'بنك الاتحاد',
      beneficiaryName: beneficiaryName ?? 'شركة الوكالة للغاز',
      iban: iban ?? 'JO94UBSI1030000123456789012345',
      createdAt: DateTime.now(),
    );
    mockWithdrawals.add(wth);
    return wth;
  }
}

void main() {
  group('Phase 6: Financial System Flutter Unit Tests', () {
    test('ProviderWalletEntity serialization and deserialization', () {
      final json = {
        'id': 'w_123',
        'providerId': 'p_123',
        'availableBalance': 250.50,
        'pendingBalance': 10.00,
        'heldBalance': 40.00,
        'totalEarned': 800.00,
        'totalWithdrawn': 500.00,
        'totalCommission': 90.00,
        'totalRefunded': 0.00,
        'liabilityBalance': 0.00,
        'currency': 'JOD',
        'status': 'active',
        'createdAt': '2026-09-30T12:00:00.000Z',
        'updatedAt': '2026-09-30T12:00:00.000Z',
      };

      final wallet = ProviderWalletEntity.fromJson(json);
      expect(wallet.id, 'w_123');
      expect(wallet.availableBalance, 250.50);
      expect(wallet.heldBalance, 40.00);
      expect(wallet.currency, 'JOD');

      final serialized = wallet.toJson();
      expect(serialized['availableBalance'], 250.50);
      expect(serialized['currency'], 'JOD');
    });

    test('WalletTransactionEntity serialization and direction validation', () {
      final json = {
        'id': 'tx_123',
        'transactionNumber': 'TX-2026-0099',
        'walletId': 'w_123',
        'providerId': 'p_123',
        'type': 'CREDIT_ORDER_PAYMENT',
        'direction': 'credit',
        'amount': 30.00,
        'balanceBefore': 220.50,
        'balanceAfter': 250.50,
        'referenceType': 'order',
        'referenceId': 'ORD-999',
        'descriptionAr': 'دفعة طلب',
        'descriptionEn': 'Order payment',
        'status': 'settled',
        'createdAt': '2026-09-30T12:00:00.000Z',
      };

      final tx = WalletTransactionEntity.fromJson(json);
      expect(tx.direction, 'credit');
      expect(tx.amount, 30.00);
      expect(tx.balanceAfter - tx.balanceBefore, closeTo(30.00, 0.001));
    });

    test('BankAccountEntity parses Jordanian IBAN correctly', () {
      final json = {
        'id': 'acc_01',
        'providerId': 'p_01',
        'bankName': 'بنك الإسكان',
        'beneficiaryName': 'أحمد علي',
        'iban': 'JO02HBTF1000000123456789012345',
        'isDefault': true,
        'isVerified': true,
        'createdAt': '2026-09-30T12:00:00.000Z',
      };

      final acc = BankAccountEntity.fromJson(json);
      expect(acc.iban.startsWith('JO'), isTrue);
      expect(acc.isDefault, isTrue);
    });

    test('WithdrawalRequestEntity status states and fields', () {
      final json = {
        'id': 'wth_01',
        'withdrawalNumber': 'WTH-2026-1001',
        'providerId': 'p_01',
        'amount': 100.00,
        'currency': 'JOD',
        'status': 'paid',
        'bankName': 'بنك الاتحاد',
        'beneficiaryName': 'شركة النور',
        'iban': 'JO94UBSI1030000123456789012345',
        'transactionReference': 'CLIQ-778899',
        'createdAt': '2026-09-30T12:00:00.000Z',
      };

      final wth = WithdrawalRequestEntity.fromJson(json);
      expect(wth.status, 'paid');
      expect(wth.amount, 100.00);
      expect(wth.transactionReference, 'CLIQ-778899');
    });

    test('ProviderWalletNotifier loads wallet asynchronously', () async {
      final mockRepo = MockFinanceRepository();
      final notifier = ProviderWalletNotifier(mockRepo);

      expect(notifier.state.isLoading, isTrue);
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.hasValue, isTrue);
      expect(notifier.state.value?.availableBalance, 150.75);
    });

    test('ProviderTransactionsNotifier filters transactions by type', () async {
      final mockRepo = MockFinanceRepository();
      final notifier = ProviderTransactionsNotifier(mockRepo);

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.value?.length, 1);

      await notifier.loadTransactions(type: 'DEBIT_WITHDRAWAL_REQUEST');
      expect(notifier.state.value?.length, 0);
    });

    test('ProviderBankAccountsNotifier adds and deletes accounts', () async {
      final mockRepo = MockFinanceRepository();
      final notifier = ProviderBankAccountsNotifier(mockRepo);

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.value?.length, 1);

      await notifier.addAccount(
        bankName: 'بنك القاهرة عمان',
        beneficiaryName: 'محمد أحمد',
        iban: 'JO12CABK1000000123456789012345',
      );
      expect(notifier.state.value?.length, 2);

      await notifier.deleteAccount('acc_001');
      expect(notifier.state.value?.length, 1);
    });

    test('ProviderWithdrawalsNotifier submits new withdrawal request', () async {
      final mockRepo = MockFinanceRepository();
      final notifier = ProviderWithdrawalsNotifier(mockRepo);

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.value?.length, 1);

      final newWth = await notifier.submitWithdrawal(amount: 75.00);
      expect(newWth.amount, 75.00);
      expect(notifier.state.value?.length, 2);
    });
  });
}

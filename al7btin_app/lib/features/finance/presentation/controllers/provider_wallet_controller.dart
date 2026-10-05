import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/repositories/api_finance_repository.dart';
import '../../domain/entities/provider_wallet_entity.dart';
import '../../domain/entities/wallet_transaction_entity.dart';
import '../../domain/entities/bank_account_entity.dart';
import '../../domain/entities/withdrawal_request_entity.dart';
import '../../domain/repositories/finance_repository_interface.dart';

/// Repository Provider
final financeRepositoryProvider = Provider<IFinanceRepository>((ref) {
  final authLocal = ref.watch(authLocalDataSourceProvider);
  return ApiFinanceRepository(authLocalDataSource: authLocal);
});

/// 1. Provider Wallet Summary Controller
class ProviderWalletNotifier extends StateNotifier<AsyncValue<ProviderWalletEntity?>> {
  final IFinanceRepository _repo;

  ProviderWalletNotifier(this._repo) : super(const AsyncValue.loading()) {
    loadWallet();
  }

  Future<void> loadWallet() async {
    state = const AsyncValue.loading();
    try {
      final wallet = await _repo.getMyWallet();
      state = AsyncValue.data(wallet);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    try {
      final wallet = await _repo.getMyWallet();
      state = AsyncValue.data(wallet);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final providerWalletControllerProvider =
    StateNotifierProvider<ProviderWalletNotifier, AsyncValue<ProviderWalletEntity?>>((ref) {
  final repo = ref.watch(financeRepositoryProvider);
  return ProviderWalletNotifier(repo);
});

/// 2. Provider Transactions Controller
class ProviderTransactionsNotifier extends StateNotifier<AsyncValue<List<WalletTransactionEntity>>> {
  final IFinanceRepository _repo;
  String? _currentTypeFilter;

  ProviderTransactionsNotifier(this._repo) : super(const AsyncValue.loading()) {
    loadTransactions();
  }

  Future<void> loadTransactions({String? type}) async {
    _currentTypeFilter = type;
    state = const AsyncValue.loading();
    try {
      final txs = await _repo.getMyTransactions(type: type);
      state = AsyncValue.data(txs);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    try {
      final txs = await _repo.getMyTransactions(type: _currentTypeFilter);
      state = AsyncValue.data(txs);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final providerTransactionsControllerProvider =
    StateNotifierProvider<ProviderTransactionsNotifier, AsyncValue<List<WalletTransactionEntity>>>((ref) {
  final repo = ref.watch(financeRepositoryProvider);
  return ProviderTransactionsNotifier(repo);
});

/// 3. Provider Bank Accounts Controller
class ProviderBankAccountsNotifier extends StateNotifier<AsyncValue<List<BankAccountEntity>>> {
  final IFinanceRepository _repo;

  ProviderBankAccountsNotifier(this._repo) : super(const AsyncValue.loading()) {
    loadBankAccounts();
  }

  Future<void> loadBankAccounts() async {
    state = const AsyncValue.loading();
    try {
      final accounts = await _repo.getMyBankAccounts();
      state = AsyncValue.data(accounts);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<BankAccountEntity> addAccount({
    required String bankName,
    required String beneficiaryName,
    required String iban,
    String? swiftCode,
  }) async {
    final newAccount = await _repo.addBankAccount(
      bankName: bankName,
      beneficiaryName: beneficiaryName,
      iban: iban,
      swiftCode: swiftCode,
    );
    await loadBankAccounts();
    return newAccount;
  }

  Future<void> deleteAccount(String accountId) async {
    await _repo.deleteBankAccount(accountId);
    await loadBankAccounts();
  }
}

final providerBankAccountsControllerProvider =
    StateNotifierProvider<ProviderBankAccountsNotifier, AsyncValue<List<BankAccountEntity>>>((ref) {
  final repo = ref.watch(financeRepositoryProvider);
  return ProviderBankAccountsNotifier(repo);
});

/// 4. Provider Withdrawals Controller
class ProviderWithdrawalsNotifier extends StateNotifier<AsyncValue<List<WithdrawalRequestEntity>>> {
  final IFinanceRepository _repo;

  ProviderWithdrawalsNotifier(this._repo) : super(const AsyncValue.loading()) {
    loadWithdrawals();
  }

  Future<void> loadWithdrawals() async {
    state = const AsyncValue.loading();
    try {
      final list = await _repo.getMyWithdrawals();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<WithdrawalRequestEntity> submitWithdrawal({
    required double amount,
    String? bankAccountId,
    String? bankName,
    String? beneficiaryName,
    String? iban,
  }) async {
    final wth = await _repo.requestWithdrawal(
      amount: amount,
      bankAccountId: bankAccountId,
      bankName: bankName,
      beneficiaryName: beneficiaryName,
      iban: iban,
    );
    await loadWithdrawals();
    return wth;
  }
}

final providerWithdrawalsControllerProvider =
    StateNotifierProvider<ProviderWithdrawalsNotifier, AsyncValue<List<WithdrawalRequestEntity>>>((ref) {
  final repo = ref.watch(financeRepositoryProvider);
  return ProviderWithdrawalsNotifier(repo);
});

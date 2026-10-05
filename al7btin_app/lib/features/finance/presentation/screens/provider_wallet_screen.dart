import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/widgets/custom_app_bar.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/gold_gradient_card.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../domain/entities/provider_wallet_entity.dart';
import '../../domain/entities/wallet_transaction_entity.dart';
import '../../domain/entities/withdrawal_request_entity.dart';
import '../controllers/provider_wallet_controller.dart';

/// Provider Wallet & Earnings Management Screen
class ProviderWalletScreen extends ConsumerStatefulWidget {
  const ProviderWalletScreen({super.key});

  @override
  ConsumerState<ProviderWalletScreen> createState() => _ProviderWalletScreenState();
}

class _ProviderWalletScreenState extends ConsumerState<ProviderWalletScreen> {
  int _selectedTab = 0; // 0: Transactions, 1: Withdrawals, 2: Bank Accounts
  String? _txFilter;

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final walletAsync = ref.watch(providerWalletControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'المحفظة والأرباح' : 'Wallet & Earnings',
        showBackButton: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.goldDark),
            tooltip: isAr ? 'تحديث البيانات' : 'Refresh',
            onPressed: () {
              ref.read(providerWalletControllerProvider.notifier).loadWallet();
              ref.read(providerTransactionsControllerProvider.notifier).loadTransactions(type: _txFilter);
              ref.read(providerWithdrawalsControllerProvider.notifier).loadWithdrawals();
              ref.read(providerBankAccountsControllerProvider.notifier).loadBankAccounts();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(providerWalletControllerProvider.notifier).refresh();
          await ref.read(providerTransactionsControllerProvider.notifier).refresh();
          await ref.read(providerWithdrawalsControllerProvider.notifier).loadWithdrawals();
        },
        color: AppColors.goldPrimary,
        child: walletAsync.when(
          loading: () => LoadingView(
            message: isAr ? 'جاري تحميل بيانات المحفظة والأرباح...' : 'Loading wallet & earnings...',
          ),
          error: (err, _) => ErrorView(
            message: err.toString(),
            onRetry: () => ref.read(providerWalletControllerProvider.notifier).loadWallet(),
          ),
          data: (wallet) {
            if (wallet == null) {
              return EmptyView(
                title: isAr ? 'المحفظة غير متوفرة' : 'Wallet not available',
                message: isAr
                    ? 'لم يتم إنشاء محفظة مالية لهذا المزود بعد.'
                    : 'No financial wallet found for this provider.',
              );
            }

            return ListView(
              padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
              children: [
                // 1. Primary Available Balance Card
                _buildAvailableBalanceCard(context, wallet, isAr),
                const SizedBox(height: AppDimensions.sm),

                // 2. Metrics 3-Grid (Held, Earned, Withdrawn)
                _buildMetricsGrid(wallet, isAr),
                const SizedBox(height: AppDimensions.md),

                // 3. Quick Action Buttons
                _buildActionButtons(context, wallet, isAr),
                const SizedBox(height: AppDimensions.md),

                // 4. Section Tabs (Transactions, Withdrawals, Bank Accounts)
                _buildSectionTabs(isAr),
                const SizedBox(height: AppDimensions.sm),

                // 5. Active Tab Content
                if (_selectedTab == 0)
                  _buildTransactionsSection(isAr)
                else if (_selectedTab == 1)
                  _buildWithdrawalsSection(isAr)
                else
                  _buildBankAccountsSection(context, isAr),

                const SizedBox(height: AppDimensions.xl),
              ],
            );
          },
        ),
      ),
    );
  }

  /// 1. Available Balance Highlight Card
  Widget _buildAvailableBalanceCard(BuildContext context, ProviderWalletEntity wallet, bool isAr) {
    return GoldGradientCard(
      hasGoldBorder: true,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.goldPrimary.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.account_balance_wallet_rounded, color: AppColors.goldDark, size: 22),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    isAr ? 'الرصيد المتاح للسحب' : 'Available for Withdrawal',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
                ),
                child: Text(
                  isAr ? 'حساب نشط' : 'Active',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: AppColors.success,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                wallet.availableBalance.toStringAsFixed(2),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                isAr ? 'د.أ (JOD)' : 'JOD',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.goldDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            isAr
              ? 'الأرباح الصافية بعد خصم عمولات المنصة المؤكدة'
              : 'Net earnings after confirmed platform commission deduction',
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 11,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  /// 2. Metrics Grid (Held, Earned, Withdrawn)
  Widget _buildMetricsGrid(ProviderWalletEntity wallet, bool isAr) {
    return Row(
      children: [
        // Held Balance
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.lock_clock_rounded, size: 14, color: AppColors.warning),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        isAr ? 'محجوز للسحب' : 'Held / Pending',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${wallet.heldBalance.toStringAsFixed(2)} د.أ',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.warning,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),

        // Total Earned
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.trending_up_rounded, size: 14, color: AppColors.success),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        isAr ? 'إجمالي الأرباح' : 'Total Earned',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${wallet.totalEarned.toStringAsFixed(2)} د.أ',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),

        // Total Withdrawn
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.outbox_rounded, size: 14, color: AppColors.info),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        isAr ? 'المسحوبات' : 'Withdrawn',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${wallet.totalWithdrawn.toStringAsFixed(2)} د.أ',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.info,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// 3. Quick Action Buttons
  Widget _buildActionButtons(BuildContext context, ProviderWalletEntity wallet, bool isAr) {
    return Row(
      children: [
        Expanded(
          flex: 3,
          child: CustomButton(
            label: isAr ? 'طلب سحب رصيد' : 'Request Withdrawal',
            icon: Icons.payments_outlined,
            onPressed: () => _showWithdrawalSheet(context, wallet, isAr),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 2,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: AppColors.goldPrimary),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.account_balance_rounded, size: 18, color: AppColors.goldDark),
            label: Text(
              isAr ? 'الحسابات البنكية' : 'Bank Accounts',
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            onPressed: () => _showBankAccountsSheet(context, isAr),
          ),
        ),
      ],
    );
  }

  /// 4. Section Tabs
  Widget _buildSectionTabs(bool isAr) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _buildTabItem(0, isAr ? 'سجل الحركات' : 'Transactions', Icons.receipt_long_rounded),
          _buildTabItem(1, isAr ? 'طلبات السحب' : 'Withdrawals', Icons.outbox_rounded),
          _buildTabItem(2, isAr ? 'الحسابات' : 'Accounts', Icons.account_balance_rounded),
        ],
      ),
    );
  }

  Widget _buildTabItem(int index, String label, IconData icon) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTab = index),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.goldPrimary : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? Colors.black : AppColors.textSecondary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                  color: isSelected ? Colors.black : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 5. Transactions Section
  Widget _buildTransactionsSection(bool isAr) {
    final txAsync = ref.watch(providerTransactionsControllerProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFilterChip(null, isAr ? 'الكل' : 'All'),
              const SizedBox(width: 6),
              _buildFilterChip('CREDIT_ORDER_PAYMENT', isAr ? 'أرباح الطلبات' : 'Order Earnings'),
              const SizedBox(width: 6),
              _buildFilterChip('DEBIT_WITHDRAWAL_REQUEST', isAr ? 'السحوبات' : 'Withdrawals'),
              const SizedBox(width: 6),
              _buildFilterChip('DEBIT_REFUND', isAr ? 'استرجاعات' : 'Refunds'),
              const SizedBox(width: 6),
              _buildFilterChip('CREDIT_QUOTATION_PAYMENT', isAr ? 'عروض الأسعار' : 'Quotations'),
            ],
          ),
        ),
        const SizedBox(height: 10),

        txAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(24.0),
            child: Center(child: CircularProgressIndicator(color: AppColors.goldPrimary)),
          ),
          error: (err, _) => ErrorView(
            message: err.toString(),
            onRetry: () => ref.read(providerTransactionsControllerProvider.notifier).loadTransactions(type: _txFilter),
          ),
          data: (txs) {
            if (txs.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.textMuted),
                    const SizedBox(height: 10),
                    Text(
                      isAr ? 'لا توجد قيود مالية مسجلة بعد' : 'No transactions recorded yet',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: txs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final tx = txs[index];
                return _buildTransactionCard(tx, isAr);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildFilterChip(String? type, String label) {
    final isSelected = _txFilter == type;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 11,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? Colors.black : AppColors.textSecondary,
        ),
      ),
      selected: isSelected,
      selectedColor: AppColors.goldPrimary,
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.border)),
      onSelected: (selected) {
        setState(() => _txFilter = selected ? type : null);
        ref.read(providerTransactionsControllerProvider.notifier).loadTransactions(type: _txFilter);
      },
    );
  }

  Widget _buildTransactionCard(WalletTransactionEntity tx, bool isAr) {
    final isCredit = tx.direction == 'credit';
    final desc = isAr ? tx.descriptionAr : tx.descriptionEn;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isCredit
                  ? AppColors.success.withValues(alpha: 0.15)
                  : AppColors.error.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
              color: isCredit ? AppColors.success : AppColors.error,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  desc.isNotEmpty ? desc : tx.type,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      tx.transactionNumber,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '• ${_formatDate(tx.createdAt)}',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 10,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                if (tx.metadata != null && tx.metadata!['commissionDetails'] != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isAr
                        ? 'عمولة المنصة: ${(tx.metadata!['commissionDetails']['calculatedCommission'] as num?)?.toStringAsFixed(2) ?? '0.00'} د.أ'
                        : 'Commission: ${(tx.metadata!['commissionDetails']['calculatedCommission'] as num?)?.toStringAsFixed(2) ?? '0.00'} JOD',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isCredit ? '+' : '-'}${tx.amount.toStringAsFixed(2)} د.أ',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: isCredit ? AppColors.success : AppColors.error,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${isAr ? 'الرصيد:' : 'Bal:'} ${tx.balanceAfter.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 10,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 6. Withdrawals Section
  Widget _buildWithdrawalsSection(bool isAr) {
    final withdrawalsAsync = ref.watch(providerWithdrawalsControllerProvider);

    return withdrawalsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(24.0),
        child: Center(child: CircularProgressIndicator(color: AppColors.goldPrimary)),
      ),
      error: (err, _) => ErrorView(
        message: err.toString(),
        onRetry: () => ref.read(providerWithdrawalsControllerProvider.notifier).loadWithdrawals(),
      ),
      data: (withdrawals) {
        if (withdrawals.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(32),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Icon(Icons.outbox_rounded, size: 48, color: AppColors.textMuted),
                const SizedBox(height: 10),
                Text(
                  isAr ? 'لا توجد طلبات سحب سابقة' : 'No withdrawal requests yet',
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: withdrawals.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final wth = withdrawals[index];
            return _buildWithdrawalCard(wth, isAr);
          },
        );
      },
    );
  }

  Widget _buildWithdrawalCard(WithdrawalRequestEntity wth, bool isAr) {
    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (wth.status) {
      case 'paid':
        statusColor = AppColors.success;
        statusText = isAr ? 'تم الصرف بنجاح' : 'Paid / Settled';
        statusIcon = Icons.check_circle_rounded;
        break;
      case 'approved':
        statusColor = AppColors.info;
        statusText = isAr ? 'معتمد للصرف' : 'Approved';
        statusIcon = Icons.verified_rounded;
        break;
      case 'rejected':
        statusColor = AppColors.error;
        statusText = isAr ? 'مرفوض' : 'Rejected';
        statusIcon = Icons.cancel_rounded;
        break;
      default:
        statusColor = AppColors.warning;
        statusText = isAr ? 'قيد المراجعة' : 'Under Review';
        statusIcon = Icons.pending_rounded;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                wth.withdrawalNumber,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.goldDark,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 12, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      statusText,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    wth.bankName,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    wth.iban,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              Text(
                '${wth.amount.toStringAsFixed(2)} د.أ',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          if (wth.rejectionReason != null && wth.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${isAr ? 'سبب الرفض:' : 'Rejection Reason:'} ${wth.rejectionReason}',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: AppColors.error),
              ),
            ),
          ],
          if (wth.transactionReference != null && wth.transactionReference!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              '${isAr ? 'الرقم المرجعي للإشعار:' : 'Transfer Ref:'} ${wth.transactionReference}',
              style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }

  /// 7. Bank Accounts Section
  Widget _buildBankAccountsSection(BuildContext context, bool isAr) {
    final accountsAsync = ref.watch(providerBankAccountsControllerProvider);

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isAr ? 'حسابات التحويل البنكي المعتمدة' : 'Verified Bank Accounts',
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            TextButton.icon(
              icon: const Icon(Icons.add_rounded, size: 18, color: AppColors.goldDark),
              label: Text(
                isAr ? 'إضافة حساب جديد' : 'Add Bank Account',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.goldDark),
              ),
              onPressed: () => _showAddBankAccountDialog(context, isAr),
            ),
          ],
        ),
        const SizedBox(height: 6),
        accountsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.goldPrimary)),
          error: (err, _) => ErrorView(
            message: err.toString(),
            onRetry: () => ref.read(providerBankAccountsControllerProvider.notifier).loadBankAccounts(),
          ),
          data: (accounts) {
            if (accounts.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(24),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.account_balance_outlined, size: 40, color: AppColors.textMuted),
                    const SizedBox(height: 8),
                    Text(
                      isAr ? 'لم تسجل حساب بنكي بعد' : 'No bank account added yet',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.goldPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => _showAddBankAccountDialog(context, isAr),
                      child: Text(
                        isAr ? 'إضافة حساب أردني (JO...)' : 'Add Jordanian IBAN (JO...)',
                        style: const TextStyle(fontFamily: 'Cairo', color: Colors.black, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: accounts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final acc = accounts[index];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: acc.isDefault ? AppColors.goldPrimary : AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.goldPrimary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.account_balance_rounded, color: AppColors.goldDark, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  acc.bankName,
                                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                                ),
                                if (acc.isDefault) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: AppColors.goldPrimary.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      isAr ? 'الأساسي' : 'Default',
                                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.goldDark),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            Text(
                              acc.beneficiaryName,
                              style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: AppColors.textSecondary),
                            ),
                            Text(
                              acc.iban,
                              style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 20),
                        tooltip: isAr ? 'حذف الحساب' : 'Delete',
                        onPressed: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text(isAr ? 'حذف الحساب البنكي' : 'Delete Account', style: const TextStyle(fontFamily: 'Cairo')),
                              content: Text(
                                isAr ? 'هل أنت متأكد من رغبتك في حذف هذا الحساب؟' : 'Are you sure you want to delete this bank account?',
                                style: const TextStyle(fontFamily: 'Cairo'),
                              ),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(isAr ? 'إلغاء' : 'Cancel')),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                                  onPressed: () => Navigator.pop(ctx, true),
                                  child: Text(isAr ? 'حذف' : 'Delete', style: const TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          );
                          if (confirm == true) {
                            await ref.read(providerBankAccountsControllerProvider.notifier).deleteAccount(acc.id);
                          }
                        },
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }

  /// 8. Withdrawal Request Bottom Sheet
  void _showWithdrawalSheet(BuildContext context, ProviderWalletEntity wallet, bool isAr) {
    final amountController = TextEditingController();
    String? selectedAccountId;
    final accountsState = ref.read(providerBankAccountsControllerProvider);
    final accounts = accountsState.value ?? [];

    if (accounts.isNotEmpty) {
      final defaultAcc = accounts.firstWhere((a) => a.isDefault, orElse: () => accounts.first);
      selectedAccountId = defaultAcc.id;
    }

    final messenger = ScaffoldMessenger.of(context);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isAr ? 'طلب سحب رصيد بنكي' : 'Request Bank Withdrawal',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                  ),
                  IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.goldPrimary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isAr ? 'الرصيد المتاح للسحب:' : 'Available Balance:',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '${wallet.availableBalance.toStringAsFixed(2)} د.أ',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.goldDark),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Amount Input
              Text(
                isAr ? 'المبلغ المراد سحبه (الحد الأدنى 10 د.أ)' : 'Withdrawal Amount (Min 10 JOD)',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  hintText: '10.00',
                  suffixText: isAr ? 'د.أ' : 'JOD',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.goldPrimary, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Bank Account Selector
              if (accounts.isNotEmpty) ...[
                Text(
                  isAr ? 'اختر الحساب البنكي للتحويل:' : 'Select Bank Account:',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: selectedAccountId,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: accounts.map((acc) {
                    return DropdownMenuItem<String>(
                      value: acc.id,
                      child: Text(
                        '${acc.bankName} - ${acc.iban}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 12),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) => setSheetState(() => selectedAccountId = val),
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isAr
                      ? 'يرجى إضافة حساب بنكي أردني معتمد أولاً لتتمكن من تقديم طلب السحب.'
                      : 'Please add a verified Jordanian bank account first before requesting withdrawal.',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: AppColors.error),
                  ),
                ),
              ],
              const SizedBox(height: 18),

              CustomButton(
                label: isAr ? 'تأكيد وإرسال طلب السحب' : 'Submit Withdrawal Request',
                icon: Icons.check_circle_outline,
                onPressed: accounts.isEmpty
                    ? () {
                        Navigator.pop(ctx);
                        _showAddBankAccountDialog(context, isAr);
                      }
                    : () async {
                        final amount = double.tryParse(amountController.text.trim());
                        if (amount == null || amount < 10.0) {
                          messenger.showSnackBar(
                            SnackBar(
                              backgroundColor: AppColors.error,
                              content: Text(
                                isAr ? 'الحد الأدنى لطلب السحب هو 10.00 د.أ' : 'Minimum withdrawal amount is 10.00 JOD',
                                style: const TextStyle(fontFamily: 'Cairo'),
                              ),
                            ),
                          );
                          return;
                        }

                        if (amount > wallet.availableBalance) {
                          messenger.showSnackBar(
                            SnackBar(
                              backgroundColor: AppColors.error,
                              content: Text(
                                isAr ? 'المبلغ المطلوب أكبر من رصيدك المتاح!' : 'Amount exceeds available balance!',
                                style: const TextStyle(fontFamily: 'Cairo'),
                              ),
                            ),
                          );
                          return;
                        }

                        try {
                          await ref.read(providerWithdrawalsControllerProvider.notifier).submitWithdrawal(
                            amount: amount,
                            bankAccountId: selectedAccountId,
                          );
                          await ref.read(providerWalletControllerProvider.notifier).refresh();

                          if (ctx.mounted) Navigator.pop(ctx);
                          messenger.showSnackBar(
                            SnackBar(
                              backgroundColor: AppColors.success,
                              content: Text(
                                isAr
                                  ? 'تم تقديم طلب السحب بنجاح وتم حجز المبلغ بانتظار التحويل'
                                  : 'Withdrawal request submitted successfully',
                                style: const TextStyle(fontFamily: 'Cairo'),
                              ),
                            ),
                          );
                        } catch (e) {
                          messenger.showSnackBar(
                            SnackBar(
                              backgroundColor: AppColors.error,
                              content: Text('فشل طلب السحب: $e', style: const TextStyle(fontFamily: 'Cairo')),
                            ),
                          );
                        }
                      },
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 9. Add Bank Account Dialog
  void _showAddBankAccountDialog(BuildContext context, bool isAr) {
    final messenger = ScaffoldMessenger.of(context);
    final bankNameCtrl = TextEditingController();
    final beneficiaryCtrl = TextEditingController();
    final ibanCtrl = TextEditingController();
    final swiftCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isAr ? 'إضافة حساب بنكي أردني' : 'Add Jordanian Bank Account',
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: AppColors.textPrimary),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: bankNameCtrl,
                decoration: InputDecoration(
                  labelText: isAr ? 'اسم البنك (مثال: بنك الاتحاد / كابيتال بنك)' : 'Bank Name',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: beneficiaryCtrl,
                decoration: InputDecoration(
                  labelText: isAr ? 'اسم المستفيد الثلاثي كما في البنك' : 'Beneficiary Name',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: ibanCtrl,
                decoration: InputDecoration(
                  labelText: isAr ? 'رقم الآيبان الدولي (يبدأ بـ JO)' : 'IBAN (Starts with JO...)',
                  hintText: 'JO00AAAA0000000000000000000000',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: swiftCtrl,
                decoration: InputDecoration(
                  labelText: isAr ? 'رمز السويفت (اختياري)' : 'SWIFT Code (Optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.goldPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final bankName = bankNameCtrl.text.trim();
              final beneficiary = beneficiaryCtrl.text.trim();
              final iban = ibanCtrl.text.trim().replaceAll(' ', '').toUpperCase();

              if (bankName.isEmpty || beneficiary.isEmpty || iban.isEmpty) {
                messenger.showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.error,
                    content: Text(
                      isAr ? 'يرجى تعبئة جميع الحقول الإلزامية' : 'Please fill all required fields',
                      style: const TextStyle(fontFamily: 'Cairo'),
                    ),
                  ),
                );
                return;
              }

              if (!iban.startsWith('JO') || iban.length < 20) {
                messenger.showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.error,
                    content: Text(
                      isAr ? 'رقم الآيبان غير صحيح (يجب أن يبدأ بـ JO ولا يقل عن 20 خانة)' : 'Invalid Jordanian IBAN format',
                      style: const TextStyle(fontFamily: 'Cairo'),
                    ),
                  ),
                );
                return;
              }

              try {
                await ref.read(providerBankAccountsControllerProvider.notifier).addAccount(
                  bankName: bankName,
                  beneficiaryName: beneficiary,
                  iban: iban,
                  swiftCode: swiftCtrl.text.trim().isNotEmpty ? swiftCtrl.text.trim() : null,
                );
                if (ctx.mounted) Navigator.pop(ctx);
                messenger.showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.success,
                    content: Text(
                      isAr ? 'تمت إضافة وتوثيق الحساب البنكي بنجاح' : 'Bank account added successfully',
                      style: const TextStyle(fontFamily: 'Cairo'),
                    ),
                  ),
                );
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.error,
                    content: Text('فشل إضافة الحساب: $e', style: const TextStyle(fontFamily: 'Cairo')),
                  ),
                );
              }
            },
            child: Text(
              isAr ? 'حفظ الحساب' : 'Save Account',
              style: const TextStyle(fontFamily: 'Cairo', color: Colors.black, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _showBankAccountsSheet(BuildContext context, bool isAr) {
    setState(() => _selectedTab = 2);
  }

  String _formatDate(DateTime date) {
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

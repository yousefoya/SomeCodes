import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../loyalty/presentation/controllers/loyalty_controller.dart';
import '../theme/admin_theme.dart';

class AdminLoyaltyView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminLoyaltyView({super.key, required this.isAr});

  @override
  ConsumerState<AdminLoyaltyView> createState() => _AdminLoyaltyViewState();
}

class _AdminLoyaltyViewState extends ConsumerState<AdminLoyaltyView> {
  final _requiredPointsCtrl = TextEditingController(text: '200');
  final _rewardValueCtrl = TextEditingController(text: '5.0');
  final _titleArCtrl = TextEditingController(text: 'مكافأة ولاء بتنحل الذهبية');
  final _titleEnCtrl = TextEditingController(text: 'btin7al Gold Loyalty Reward');
  final _simPointsCtrl = TextEditingController(text: '400');
  bool _isActive = true;
  bool _isSaving = false;

  @override
  void dispose() {
    _requiredPointsCtrl.dispose();
    _rewardValueCtrl.dispose();
    _titleArCtrl.dispose();
    _titleEnCtrl.dispose();
    _simPointsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isAr = widget.isAr;

    final isMobile = MediaQuery.of(context).size.width < 700;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(isMobile ? 14 : 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AdminTheme.maxContentWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AdminTheme.cardDecoration,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 600;

                    final iconBadge = Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AdminTheme.goldPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.stars_rounded,
                        color: AdminTheme.goldDark,
                        size: 26,
                      ),
                    );

                    final textColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'إدارة برنامج نقاط الولاء والمكافآت' : 'Loyalty Program & Rewards Engine',
                          style: TextStyle(
                            fontSize: isNarrow ? 17 : 18,
                            fontWeight: FontWeight.w900,
                            color: AdminTheme.textPrimary,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isAr
                              ? 'التحكم في قواعد اكتساب النقاط واستبدالها برصيد نقدي في محفظة العميل'
                              : 'Configure point earnings, redemption thresholds, and wallet reward values in PostgreSQL',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AdminTheme.textMuted,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    );

                    final saveBtn = ElevatedButton.icon(
                      style: AdminTheme.primaryButtonStyle,
                      icon: _isSaving
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.save_rounded, size: 18),
                      label: Text(
                        isAr ? 'حفظ الإعدادات' : 'Save Rules',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                      ),
                      onPressed: _isSaving ? null : () => _saveLoyaltySettings(context, isAr),
                    );

                    if (isNarrow) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              iconBadge,
                              const SizedBox(width: 12),
                              Expanded(child: textColumn),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Align(
                            alignment: isAr ? Alignment.centerRight : Alignment.centerLeft,
                            child: saveBtn,
                          ),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        iconBadge,
                        const SizedBox(width: 14),
                        Expanded(child: textColumn),
                        const SizedBox(width: 14),
                        saveBtn,
                      ],
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Settings Form & Rewards Simulator Row
              LayoutBuilder(
                builder: (context, constraints) {
                  final isNarrow = constraints.maxWidth < 800;
                  final isCompactForm = constraints.maxWidth < 500;

                  final pointsField = TextField(
                    controller: _requiredPointsCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: isAr ? 'النقاط المطلوبة لكل مكافأة' : 'Required Points Per Reward',
                      helperText: isAr ? 'مثال: 200 نقطة' : 'e.g. 200 pts',
                      prefixIcon: const Icon(Icons.stars_rounded, color: AdminTheme.goldDark),
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  );

                  final rewardField = TextField(
                    controller: _rewardValueCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: isAr ? 'قيمة المكافأة في المحفظة (د.أ)' : 'Reward Cash Value (JOD)',
                      helperText: isAr ? 'مثال: 5.0 د.أ' : 'e.g. 5.0 JOD',
                      prefixIcon: const Icon(Icons.account_balance_wallet_rounded, color: AdminTheme.goldDark),
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  );

                  final formCard = Container(
                    padding: EdgeInsets.all(isCompactForm ? 16 : 24),
                    decoration: AdminTheme.cardDecoration,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isAr ? 'قواعد برنامج الولاء في الخادم' : 'Backend Loyalty Rules',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'Cairo'),
                            ),
                            Row(
                              children: [
                                Text(
                                  _isActive ? (isAr ? 'البرنامج مفعل' : 'Active') : (isAr ? 'معطل' : 'Disabled'),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: _isActive ? AdminTheme.success : AdminTheme.error,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Switch(
                                  value: _isActive,
                                  activeThumbColor: AdminTheme.success,
                                  onChanged: (val) => setState(() => _isActive = val),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        if (isCompactForm) ...[
                          pointsField,
                          const SizedBox(height: 14),
                          rewardField,
                        ] else
                          Row(
                            children: [
                              Expanded(child: pointsField),
                              const SizedBox(width: 16),
                              Expanded(child: rewardField),
                            ],
                          ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _titleArCtrl,
                          decoration: InputDecoration(
                            labelText: isAr ? 'عنوان المكافأة (عربي)' : 'Reward Title (Arabic)',
                            border: const OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _titleEnCtrl,
                          decoration: InputDecoration(
                            labelText: isAr ? 'عنوان المكافأة (إنجليزي)' : 'Reward Title (English)',
                            border: const OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ),
                  );

                  final simCard = Container(
                    padding: EdgeInsets.all(isCompactForm ? 16 : 24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AdminTheme.goldPrimary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: AdminTheme.goldPrimary.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.calculate_rounded, color: AdminTheme.goldPrimary, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              isAr ? 'محاكي النقاط والمكافآت' : 'Points Simulator',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _simPointsCtrl,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: isAr ? 'أدخل عدد النقاط للاختبار' : 'Test Points Amount',
                            labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.tune_rounded, color: AdminTheme.goldPrimary),
                            enabledBorder: OutlineInputBorder(
                              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                            ),
                            focusedBorder: const OutlineInputBorder(
                              borderSide: BorderSide(color: AdminTheme.goldPrimary),
                            ),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 20),
                        _buildSimulationResult(isAr),
                      ],
                    ),
                  );

                  if (isNarrow) {
                    return Column(
                      children: [
                        formCard,
                        const SizedBox(height: 20),
                        simCard,
                      ],
                    );
                  }

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 3, child: formCard),
                      const SizedBox(width: 20),
                      Expanded(flex: 2, child: simCard),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSimulationResult(bool isAr) {
    final pts = int.tryParse(_simPointsCtrl.text) ?? 0;
    final req = int.tryParse(_requiredPointsCtrl.text) ?? 200;
    final val = double.tryParse(_rewardValueCtrl.text) ?? 5.0;

    final rewardsCount = req > 0 ? (pts / req).floor() : 0;
    final totalRewardJOD = rewardsCount * val;
    final remainingPts = req > 0 ? pts % req : 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(isAr ? 'المكافآت المستحقة:' : 'Eligible Rewards:', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              Text('$rewardsCount ${isAr ? 'مكافأة' : 'Rewards'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(isAr ? 'القيمة النقدية بالمحفظة:' : 'Cash in Wallet:', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              Text('${totalRewardJOD.toStringAsFixed(2)} د.أ', style: const TextStyle(color: AdminTheme.goldPrimary, fontWeight: FontWeight.w900, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(isAr ? 'النقاط المتبقية بعد الاستبدال:' : 'Remaining Points:', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              Text('$remainingPts ${isAr ? 'نقطة' : 'pts'}', style: const TextStyle(color: Colors.white, fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _saveLoyaltySettings(BuildContext context, bool isAr) async {
    setState(() => _isSaving = true);
    try {
      final reqPoints = int.tryParse(_requiredPointsCtrl.text) ?? 200;
      final rewVal = double.tryParse(_rewardValueCtrl.text) ?? 5.0;

      await ref.read(loyaltyRepositoryProvider).updateAdminSettings(
            requiredPoints: reqPoints,
            rewardValue: rewVal,
            titleAr: _titleArCtrl.text.trim(),
            titleEn: _titleEnCtrl.text.trim(),
            isActive: _isActive,
          );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isAr ? 'تم تحديث قواعد برنامج الولاء في الخادم بنجاح' : 'Loyalty rules updated in PostgreSQL'),
            backgroundColor: AdminTheme.success,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ: $e'), backgroundColor: AdminTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../auth/domain/entities/user_entity.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import '../../loyalty/presentation/controllers/loyalty_controller.dart';

/// Profile Screen connected to AuthController, Loyalty Program, and Role-Based Portal Shortcuts
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  void _showRedemptionDialog(BuildContext context, WidgetRef ref, bool isAr, dynamic rewardData) {
    showDialog<void>(
      context: context,
      builder: (ctx) {
        final couponCode = rewardData['coupon']?['code']?.toString() ?? 'LOYAL-COUPON';
        final rewardVal = rewardData['coupon']?['value']?.toString() ?? '5';

        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.stars_rounded, color: AppColors.goldDark, size: 24),
              const SizedBox(width: 8),
              Text(
                isAr ? 'مبروك! تم استبدال المكافأة' : 'Congratulations! Reward Claimed',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isAr
                    ? 'لقد حصلت على كوبون خصم بقيمة $rewardVal د.أ لطلبك القادم:'
                    : 'You received a $rewardVal JOD discount coupon for your next order:',
                style: const TextStyle(fontSize: 13, fontFamily: 'Cairo', color: AppColors.textSecondary),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.goldPrimary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.goldPrimary),
                ),
                child: Text(
                  couponCode,
                  style: const TextStyle(
                    color: AppColors.goldDark,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2.0,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.goldPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => Navigator.pop(ctx),
              child: Text(isAr ? 'تم' : 'Done', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontFamily: 'Cairo')),
            ),
          ],
        );
      },
    );
  }

  void _showChangePhoneDialog(BuildContext context, WidgetRef ref, bool isAr) async {
    final newPhone = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _ChangePhoneDialog(isAr: isAr, ref: ref),
    );

    if (newPhone != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr ? 'تم تحديث رقم الهاتف بنجاح إلى: $newPhone' : 'Phone number updated successfully to: $newPhone',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  void _showDeleteAccountDialog(BuildContext context, WidgetRef ref, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
              const SizedBox(width: 8),
              Text(
                isAr ? 'حذف الحساب نهائياً' : 'Delete Account',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.error),
              ),
            ],
          ),
          content: Text(
            isAr
                ? 'هل أنت متأكد من رغبتك في حذف حسابك؟ سيتم إيقاف الحساب وتسجيل خروجك فوراً مع الحفاظ على سجل الطلبات التاريخية.'
                : 'Are you sure you want to delete your account? Your account will be deactivated and you will be logged out immediately.',
            style: const TextStyle(fontSize: 13, fontFamily: 'Cairo', color: AppColors.textSecondary, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(color: AppColors.textMuted, fontFamily: 'Cairo')),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                Navigator.pop(ctx);
                await ref.read(authControllerProvider.notifier).deleteAccount();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        isAr ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully',
                        style: const TextStyle(fontFamily: 'Cairo'),
                      ),
                      backgroundColor: AppColors.textPrimary,
                    ),
                  );
                  context.go(RoutePaths.login);
                }
              },
              child: Text(
                isAr ? 'تأكيد الحذف' : 'Confirm Delete',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(appLocaleProvider);
    final isAr = currentLocale.languageCode == 'ar';

    final authState = ref.watch(authControllerProvider);
    final user = authState.user;

    final userName = user?.name ?? (isAr ? 'عميل بتنحل' : 'btin7al Customer');
    final userPhone = user?.phoneNumber ?? (isAr ? 'لم يتم تسجيل الدخول' : 'Not logged in');
    final loyaltyAsync = ref.watch(loyaltyControllerProvider);
    final referralCode = user?.referralCode ?? 'BTN-PROMO';
    final userRole = user?.role ?? UserRole.customer;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'الملف الشخصي' : 'Profile',
        showBackButton: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Column(
            children: [
              // User Info Card with Role Badge
              GoldGradientCard(
                hasGoldBorder: true,
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: AppColors.goldGradient,
                      ),
                      child: Center(
                        child: Icon(
                          userRole == UserRole.admin
                              ? Icons.admin_panel_settings_rounded
                              : userRole == UserRole.provider
                                  ? Icons.storefront_rounded
                                  : Icons.person,
                          color: Colors.white,
                          size: 30,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                userName,
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isAr ? userRole.labelAr : userRole.labelEn,
                                  style: const TextStyle(
                                    color: AppColors.goldDark,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            userPhone,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!authState.isAuthenticated)
                      TextButton(
                        onPressed: () => context.push(RoutePaths.login),
                        child: Text(
                          isAr ? 'دخول / تسجيل' : 'Login / Register',
                          style: const TextStyle(color: AppColors.goldDark, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Prominent Loyalty Points & Rewards Card
              loyaltyAsync.when(
                loading: () => const GoldGradientCard(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.goldPrimary),
                      ),
                    ),
                  ),
                ),
                error: (_, __) => const SizedBox.shrink(),
                data: (loyalty) {
                  final points = loyalty.points;
                  final requiredPoints = loyalty.requiredPointsForReward > 0 ? loyalty.requiredPointsForReward : 200;
                  final progress = (points / requiredPoints).clamp(0.0, 1.0);
                  final isEligible = points >= requiredPoints;
                  final rewardTitle = isAr ? loyalty.rewardTitleAr : loyalty.rewardTitleEn;

                  return GoldGradientCard(
                    hasGoldBorder: true,
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.stars_rounded, color: AppColors.goldDark, size: 24),
                                const SizedBox(width: 8),
                                Text(
                                  isAr ? 'برنامج مكافآت بتنحل' : 'Loyalty Rewards Program',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: 'Cairo',
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '$points ${isAr ? "نقطة" : "Pts"}',
                                style: const TextStyle(
                                  color: AppColors.goldDark,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          isAr
                              ? 'كل طلب مكتمل يمنحك +10 نقاط. اجمع $requiredPoints نقطة للحصول على: $rewardTitle'
                              : 'Every completed order earns +10 pts. Reach $requiredPoints pts to get: $rewardTitle',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: AppColors.textSecondary,
                            fontFamily: 'Cairo',
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Progress Bar to 200 Points
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 8,
                            backgroundColor: AppColors.border,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.goldPrimary),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isAr ? '$points / $requiredPoints نقطة' : '$points / $requiredPoints pts',
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontFamily: 'Cairo', fontWeight: FontWeight.w700),
                            ),
                            if (isEligible)
                              Text(
                                isAr ? '🎉 مؤهل للمكافأة!' : '🎉 Reward Eligible!',
                                style: const TextStyle(fontSize: 11, color: AppColors.success, fontFamily: 'Cairo', fontWeight: FontWeight.w800),
                              ),
                          ],
                        ),
                        if (isEligible && authState.isAuthenticated) ...[
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.goldPrimary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              icon: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 18),
                              label: Text(
                                isAr ? 'استبدال المكافأة الآن ($requiredPoints نقطة)' : 'Redeem Reward ($requiredPoints pts)',
                                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 12.5, color: Colors.white),
                              ),
                              onPressed: () async {
                                try {
                                  final result = await ref.read(loyaltyControllerProvider.notifier).redeemReward();
                                  if (context.mounted) {
                                    _showRedemptionDialog(context, ref, isAr, result);
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(isAr ? 'فشل استبدال المكافأة: $e' : 'Redemption failed: $e'),
                                        backgroundColor: AppColors.error,
                                      ),
                                    );
                                  }
                                }
                              },
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Role Portal Shortcuts (3-Role Model: Admin & Provider)
              if (userRole == UserRole.admin) ...[
                _buildMenuItem(
                  icon: Icons.admin_panel_settings_rounded,
                  title: isAr ? 'لوحة إدارة النظام (Admin Portal)' : 'Admin Dashboard Portal',
                  subtitle: isAr ? 'إدارة المستخدمين والخدمات والمزودين والطلبات' : 'Manage users, services, providers, orders',
                  iconColor: AppColors.goldDark,
                  onTap: () => context.go(RoutePaths.adminPortal),
                ),
              ],
              if (userRole == UserRole.provider) ...[
                _buildMenuItem(
                  icon: Icons.storefront_rounded,
                  title: isAr ? 'لوحة تحكم المزود (Provider Portal)' : 'Provider Dashboard Portal',
                  subtitle: isAr ? 'إدارة توفر الخدمات واستقبال وتنفيذ الطلبات' : 'Manage service availability and fulfill orders',
                  iconColor: AppColors.goldDark,
                  onTap: () => context.go(RoutePaths.providerPortal),
                ),
              ],

              // Referral Code banner
              GoldGradientCard(
                hasGoldBorder: true,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.card_giftcard_rounded, color: AppColors.goldDark, size: 22),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isAr ? 'كود الدعوة الخاص بك' : 'Your Referral Code',
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            Text(
                              referralCode,
                              style: const TextStyle(
                                color: AppColors.goldDark,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy_rounded, color: AppColors.goldDark, size: 18),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              isAr ? 'تم نسخ كود الدعوة: $referralCode' : 'Referral code copied: $referralCode',
                              style: const TextStyle(fontFamily: 'Cairo'),
                            ),
                            backgroundColor: AppColors.success,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Settings & Navigation Options
              _buildMenuItem(
                icon: Icons.location_on_outlined,
                title: isAr ? 'عناويني المحفوظة (عمان)' : 'Saved Addresses (Amman)',
                subtitle: isAr ? 'إدارة وتحديد المواقع الجغرافية داخل عمان' : 'Manage delivery addresses inside Amman',
                onTap: () {
                  context.push(RoutePaths.addresses);
                },
              ),

              if (authState.isAuthenticated) ...[
                _buildMenuItem(
                  icon: Icons.phone_android_rounded,
                  title: isAr ? 'تغيير رقم الهاتف' : 'Change Phone Number',
                  subtitle: isAr ? 'تحديث رقم الهاتف مع التحقق الفوري عبر SMS' : 'Update phone number with SMS verification',
                  onTap: () => _showChangePhoneDialog(context, ref, isAr),
                ),
              ],

              _buildMenuItem(
                icon: Icons.language_rounded,
                title: isAr ? 'لغة التطبيق / App Language' : 'App Language / لغة التطبيق',
                subtitle: isAr ? 'العربية (الحالية)' : 'English (Active)',
                trailing: Text(
                  isAr ? 'عربي' : 'EN',
                  style: const TextStyle(color: AppColors.goldDark, fontWeight: FontWeight.w800),
                ),
                onTap: () {
                  ref.read(appLocaleProvider.notifier).toggleLocale();
                },
              ),
              _buildMenuItem(
                icon: Icons.headset_mic_outlined,
                title: isAr ? 'الدعم الفني والشكاوى' : 'Support & Complaints',
                subtitle: isAr ? 'مركز المساعدة وخدمة العملاء 24/7' : 'Customer support center',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        isAr ? 'مركز الدعم الفني: 06-5000000' : 'Customer Support: 06-5000000',
                        style: const TextStyle(fontFamily: 'Cairo'),
                      ),
                      backgroundColor: AppColors.goldDark,
                    ),
                  );
                },
              ),

              if (authState.isAuthenticated) ...[
                _buildMenuItem(
                  icon: Icons.logout_rounded,
                  title: isAr ? 'تسجيل الخروج' : 'Logout',
                  subtitle: isAr ? 'إنهاء الجلسة والعودة للبداية' : 'End session and exit',
                  iconColor: AppColors.textMuted,
                  onTap: () async {
                    await ref.read(authControllerProvider.notifier).logout();
                    if (context.mounted) {
                      context.go(RoutePaths.login);
                    }
                  },
                ),
                _buildMenuItem(
                  icon: Icons.delete_forever_rounded,
                  title: isAr ? 'حذف الحساب' : 'Delete Account',
                  subtitle: isAr ? 'إيقاف الحساب نهائياً وتطهير الجلسات' : 'Deactivate account and revoke sessions',
                  iconColor: AppColors.error,
                  onTap: () => _showDeleteAccountDialog(context, ref, isAr),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? iconColor,
    Widget? trailing,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GoldGradientCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Icon(icon, color: iconColor ?? AppColors.goldDark, size: 22),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                      fontFamily: 'Cairo',
                    ),
                  ),
                ],
              ),
            ),
            trailing ?? const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.textMuted, size: 14),
          ],
        ),
      ),
    );
  }
}

/// Interactive 2-step Dialog for Phone Number Change with SMS OTP Verification
class _ChangePhoneDialog extends StatefulWidget {
  final bool isAr;
  final WidgetRef ref;
  const _ChangePhoneDialog({required this.isAr, required this.ref});

  @override
  State<_ChangePhoneDialog> createState() => _ChangePhoneDialogState();
}

class _ChangePhoneDialogState extends State<_ChangePhoneDialog> {
  int _step = 1;
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  String? _devOtp;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone.length < 9) {
      setState(() {
        _errorMessage = widget.isAr ? 'يرجى إدخال رقم هاتف أردني صالح (مثل 0791234567)' : 'Please enter a valid Jordanian phone number';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await widget.ref.read(authControllerProvider.notifier).sendChangePhoneOtp(phone);
      if (mounted) {
        setState(() {
          _isLoading = false;
          _devOtp = result.devOtp;
          _step = 2;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('AuthFailure: ', '').replaceAll('Exception: ', '');
        });
      }
    }
  }

  Future<void> _handleVerifyAndSave() async {
    final otp = _otpController.text.trim();
    final phone = _phoneController.text.trim();
    if (otp.length < 4) {
      setState(() {
        _errorMessage = widget.isAr ? 'يرجى إدخال رمز التحقق' : 'Please enter the verification code';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final updatedUser = await widget.ref.read(authControllerProvider.notifier).changePhoneNumber(phone, otp);
      if (mounted) {
        Navigator.pop(context, updatedUser.phoneNumber);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('AuthFailure: ', '').replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          const Icon(Icons.phone_android_rounded, color: AppColors.goldDark, size: 24),
          const SizedBox(width: 8),
          Text(
            widget.isAr ? 'تغيير رقم الهاتف' : 'Change Phone Number',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_step == 1) ...[
              Text(
                widget.isAr
                    ? 'أدخل رقم هاتفك الجديد. سنرسل رمز تحقق عبر SMS للتأكيد:'
                    : 'Enter your new phone number. We will send an SMS verification code:',
                style: const TextStyle(fontSize: 13, fontFamily: 'Cairo', color: AppColors.textSecondary),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                textAlign: TextAlign.left,
                textDirection: TextDirection.ltr,
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'رقم الهاتف الجديد' : 'New Phone Number',
                  hintText: '079XXXXXXX',
                  prefixIcon: const Icon(Icons.phone_outlined, color: AppColors.goldDark),
                  filled: true,
                  fillColor: AppColors.backgroundSecondary,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.goldPrimary, width: 2)),
                ),
              ),
            ] else ...[
              Text(
                widget.isAr
                    ? 'تم إرسال رمز التحقق إلى الرقم:\n${_phoneController.text.trim()}'
                    : 'Verification code sent to:\n${_phoneController.text.trim()}',
                style: const TextStyle(fontSize: 13, fontFamily: 'Cairo', color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),

              // Development OTP Banner in Change Phone Dialog
              if (_devOtp != null && _devOtp!.isNotEmpty) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF8E7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFFB300), width: 1.2),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.isAr ? 'رمز تجريبي (وضع التطوير):' : 'Demo OTP (Dev Mode):',
                            style: const TextStyle(fontSize: 10, color: Color(0xFF78350F), fontFamily: 'Cairo', fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _devOtp!,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFFB45309), letterSpacing: 2),
                          ),
                        ],
                      ),
                      InkWell(
                        onTap: () {
                          _otpController.text = _devOtp!;
                          _handleVerifyAndSave();
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD97706),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            widget.isAr ? 'تعبئة وتأكيد' : 'Autofill',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Cairo',
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: 6, color: AppColors.goldDark),
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'رمز التحقق (OTP)' : 'Verification Code',
                  hintText: 'XXXX',
                  filled: true,
                  fillColor: AppColors.backgroundSecondary,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.goldPrimary, width: 2)),
                ),
              ),
            ],
            if (_errorMessage != null) ...[
              const SizedBox(height: 10),
              Text(
                _errorMessage!,
                style: const TextStyle(color: AppColors.error, fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w600),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: Text(widget.isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(color: AppColors.textMuted, fontFamily: 'Cairo')),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.goldPrimary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: _isLoading ? null : (_step == 1 ? _handleSendOtp : _handleVerifyAndSave),
          child: _isLoading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(
                  _step == 1
                      ? (widget.isAr ? 'إرسال الرمز' : 'Send Code')
                      : (widget.isAr ? 'تأكيد وتحديث' : 'Confirm & Update'),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                ),
        ),
      ],
    );
  }
}

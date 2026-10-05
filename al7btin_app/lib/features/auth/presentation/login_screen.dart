import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/api_config.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/brand_logo.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../../core/widgets/server_config_dialog.dart';
import 'controllers/auth_controller.dart';

enum AuthMode { login, register }

/// Modern Customer Login & Sign Up Screen for بتنحل (btin7al)
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  AuthMode _authMode = AuthMode.login;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isSendingOtp = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp(bool isAr) async {
    if (_isSendingOtp) return;

    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone.length < 9) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr
                ? 'يرجى إدخال رقم هاتف أردني صحيح (مثال: 0791234567)'
                : 'Please enter a valid Jordanian phone number (e.g. 0791234567)',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final name = _authMode == AuthMode.register ? _nameController.text.trim() : null;
    if (_authMode == AuthMode.register && (name == null || name.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr ? 'يرجى إدخال اسمك الكامل لإنشاء الحساب' : 'Please enter your full name to register',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSendingOtp = true);

    try {
      final isRegister = _authMode == AuthMode.register;
      final success = await ref.read(authControllerProvider.notifier).sendOtp(phone, name: name, isRegister: isRegister);
      if (success && mounted) {
        context.push(RoutePaths.otp);
      }
    } finally {
      if (mounted) {
        setState(() => _isSendingOtp = false);
      }
    }
  }

  void _showServerConfigDialog(BuildContext context, bool isAr) {
    ServerConfigDialog.show(context, isAr: isAr, onSaved: () {
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: _authMode == AuthMode.login
            ? (isAr ? 'تسجيل الدخول' : 'Customer Login')
            : (isAr ? 'إنشاء حساب جديد' : 'Sign Up / Register'),
        showBackButton: true,
        onBack: () => context.go(RoutePaths.home),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_ethernet_rounded, color: AppColors.goldDark, size: 22),
            tooltip: isAr ? 'إعدادات عنوان الخادم' : 'Server Settings',
            onPressed: () => _showServerConfigDialog(context, isAr),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppDimensions.lg, vertical: AppDimensions.md),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 8),
                const BrandLogo(size: 68, showSlogan: true),
                const SizedBox(height: 18),

                // Tab Selector for Login vs Sign Up
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _authMode = AuthMode.login),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _authMode == AuthMode.login ? AppColors.goldPrimary : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: _authMode == AuthMode.login
                                  ? [
                                      BoxShadow(
                                        color: AppColors.goldPrimary.withValues(alpha: 0.3),
                                        blurRadius: 8,
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                isAr ? 'تسجيل الدخول' : 'Login',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                  color: _authMode == AuthMode.login ? Colors.white : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _authMode = AuthMode.register),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _authMode == AuthMode.register ? AppColors.goldPrimary : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: _authMode == AuthMode.register
                                  ? [
                                      BoxShadow(
                                        color: AppColors.goldPrimary.withValues(alpha: 0.3),
                                        blurRadius: 8,
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                isAr ? 'إنشاء حساب جديد' : 'Sign Up',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                  color: _authMode == AuthMode.register ? Colors.white : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                GoldGradientCard(
                  hasGoldBorder: true,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _authMode == AuthMode.login
                            ? (isAr ? 'أهلاً بك مجدداً في بتنحل' : 'Welcome back to btin7al')
                            : (isAr ? 'حساب عميل جديد في بتنحل' : 'Create new customer account'),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _authMode == AuthMode.login
                            ? (isAr ? 'أدخل رقم هاتفك لتلقي رمز التحقق السريع (OTP)' : 'Enter your phone number to receive a one-time passcode')
                            : (isAr ? 'أدخل اسمك ورقم هاتفك للانضمام وكسب نقاط الولاء' : 'Enter your name and phone number to join & earn loyalty points'),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 18),

                      if (_authMode == AuthMode.register) ...[
                        Text(
                          isAr ? 'الاسم الكامل' : 'Full Name',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameController,
                          keyboardType: TextInputType.name,
                          style: const TextStyle(color: AppColors.textPrimary, fontSize: 15, fontFamily: 'Cairo'),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.person_outline_rounded, color: AppColors.goldDark),
                            hintText: isAr ? 'مثال: محمد عبدالله' : 'e.g. Mohammad Abdullah',
                            hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontFamily: 'Cairo'),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      Text(
                        isAr ? 'رقم الهاتف الأردني' : 'Jordanian Mobile Number',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),

                      // Phone Input Field
                      Directionality(
                        textDirection: TextDirection.ltr,
                        child: TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                          ),
                          decoration: InputDecoration(
                            prefixIcon: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              margin: const EdgeInsets.only(right: 8),
                              decoration: const BoxDecoration(
                                border: Border(
                                  right: BorderSide(color: AppColors.border, width: 1),
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '🇯🇴 +962',
                                    style: TextStyle(
                                      color: AppColors.goldDark,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            hintText: '079XXXXXXX',
                            hintStyle: const TextStyle(
                              color: AppColors.textMuted,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ),
                      ),

                      if (authState.hasError) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  authState.errorMessage ?? '',
                                  style: const TextStyle(
                                    color: AppColors.error,
                                    fontSize: 12,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 22),
                      CustomButton(
                        label: _authMode == AuthMode.login
                            ? (isAr ? 'إرسال رمز التحقق للدخول' : 'Send Verification Code')
                            : (isAr ? 'إنشاء الحساب ومتابعة التحقق' : 'Create Account & Verify'),
                        icon: Icons.arrow_forward_rounded,
                        isLoading: isLoading || _isSendingOtp,
                        onPressed: (isLoading || _isSendingOtp) ? null : () => _handleSendOtp(isAr),
                      ),
                    ],
                  ),
                ),
                // Server Connection Indicator & Fast Configuration
                GestureDetector(
                  onTap: () => _showServerConfigDialog(context, isAr),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.wifi_tethering_rounded, size: 16, color: AppColors.goldDark),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${isAr ? "الخادم المتصل" : "API Host"}: ${ApiConfig.baseUrl}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                              fontFamily: 'monospace',
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.goldPrimary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isAr ? 'تغيير / فحص' : 'Change / Test',
                            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.goldDark, fontFamily: 'Cairo'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Guest exploration bypass
                TextButton.icon(
                  onPressed: () => context.go(RoutePaths.home),
                  icon: const Icon(Icons.explore_outlined, size: 18, color: AppColors.goldDark),
                  label: Text(
                    isAr ? 'تخطي واستكشاف الخدمات كزائر' : 'Skip and explore as Guest',
                    style: const TextStyle(
                      color: AppColors.goldDark,
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isAr
                      ? 'بالمتابعة فإنك توافق على الشروط والأحكام وسياسة الخصوصية لمنصة بتنحل'
                      : 'By continuing, you agree to btin7al Terms & Privacy Policy',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                    fontFamily: 'Cairo',
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

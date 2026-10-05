import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../domain/entities/user_entity.dart';
import 'controllers/auth_controller.dart';

/// Modern OTP Verification Screen with 4-box PIN inputs and dynamic test helper
class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  int _resendCountdown = 60;
  Timer? _timer;
  bool _isVerifying = false;
  bool _isAutofilling = false;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  void _startResendTimer() {
    _timer?.cancel();
    if (mounted) {
      setState(() => _resendCountdown = 60);
    }
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendCountdown > 0) {
        setState(() => _resendCountdown--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  Future<void> _handleVerify() async {
    if (_isVerifying) return;

    final isAr = ref.read(appLocaleProvider).languageCode == 'ar';
    final otp = _otpCode.trim();
    if (otp.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr ? 'يرجى إدخال رمز التحقق المكون من 4 إلى 6 أرقام' : 'Please enter the 4 to 6-digit verification code',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isVerifying = true);

    try {
      final success = await ref.read(authControllerProvider.notifier).verifyOtp(otp);
      if (success && mounted) {
        final user = ref.read(authControllerProvider).user;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isAr ? 'تم تسجيل الدخول بنجاح! مرحباً بك في بتنحل' : 'Logged in successfully! Welcome to btin7al',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppColors.success,
          ),
        );
        if (user?.role == UserRole.admin) {
          context.go(RoutePaths.adminPortal);
        } else if (user?.role == UserRole.provider) {
          context.go(RoutePaths.providerPortal);
        } else {
          context.go(RoutePaths.home);
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isVerifying = false);
      }
    }
  }

  Future<void> _handleResend() async {
    final isAr = ref.read(appLocaleProvider).languageCode == 'ar';
    final authState = ref.read(authControllerProvider);
    final phone = authState.phoneNumber;
    if (phone != null) {
      final success = await ref.read(authControllerProvider.notifier).sendOtp(phone, name: authState.customerName, isRegister: authState.isRegister);
      if (success && mounted) {
        _startResendTimer();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isAr ? 'تم إعادة إرسال رمز التحقق بنجاح' : 'Verification code resent successfully',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    }
  }

  void _autofillOtp(String code) {
    if (_isVerifying || _isAutofilling) return;
    _isAutofilling = true;

    final clean = code.trim();
    for (int i = 0; i < 6; i++) {
      if (i < clean.length) {
        _controllers[i].text = clean[i];
      } else {
        _controllers[i].clear();
      }
    }

    _isAutofilling = false;

    if (clean.length >= 4) {
      final lastIdx = clean.length < 6 ? clean.length - 1 : 5;
      _focusNodes[lastIdx].requestFocus();
      _handleVerify();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final authState = ref.watch(authControllerProvider);
    final phone = authState.phoneNumber ?? '079XXXXXXX';
    final isLoading = authState.isLoading || _isVerifying;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'التحقق من الهاتف' : 'Verify Phone',
        showBackButton: true,
        onBack: () => context.canPop() ? context.pop() : context.go(RoutePaths.login),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: AppDimensions.lg, vertical: AppDimensions.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 16),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.goldPrimary, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.goldPrimary.withValues(alpha: 0.2),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.sms_outlined, size: 34, color: AppColors.goldDark),
              ),
              const SizedBox(height: 20),
              Text(
                isAr ? 'أدخل رمز التحقق (OTP)' : 'Enter Verification Code',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  fontFamily: 'Cairo',
                ),
              ),
              const SizedBox(height: 6),
              Text(
                isAr ? 'تم إرسال رمز التحقق إلى الرقم:\n$phone' : 'We sent a verification code to:\n$phone',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  fontFamily: 'Cairo',
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Development Mode Banner (Only shown when devOtp is returned by backend)
              if (authState.devOtp != null && authState.devOtp!.isNotEmpty) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF8E7),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFFB300), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFFB300).withValues(alpha: 0.15),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFB300).withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.developer_mode_rounded, color: Color(0xFFD97706), size: 18),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isAr ? 'وضع التطوير التجريبي (Development OTP)' : 'Development Demo Mode',
                              style: const TextStyle(
                                color: Color(0xFFB45309),
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                                fontFamily: 'Cairo',
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  isAr ? 'رمز التحقق التجريبي:' : 'Demo OTP Code:',
                                  style: const TextStyle(
                                    color: Color(0xFF78350F),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                                const SizedBox(height: 2),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  alignment: isAr ? Alignment.centerRight : Alignment.centerLeft,
                                  child: Text(
                                    authState.devOtp!,
                                    style: const TextStyle(
                                      color: Color(0xFFB45309),
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 4,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          InkWell(
                            onTap: (_isVerifying || isLoading) ? null : () => _autofillOtp(authState.devOtp!),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706),
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFD97706).withValues(alpha: 0.25),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.bolt_rounded, size: 16, color: Colors.white),
                                  const SizedBox(width: 4),
                                  Text(
                                    isAr ? 'تعبئة وتأكيد' : 'Autofill',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'Cairo',
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],

              GoldGradientCard(
                hasGoldBorder: true,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Responsive 6-Digit OTP Boxes (LTR)
                    Directionality(
                      textDirection: TextDirection.ltr,
                      child: Row(
                        children: List.generate(6, (index) {
                          return Expanded(
                            child: Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: index == 0 || index == 5 ? 2.0 : 3.0,
                              ),
                              child: SizedBox(
                                height: 52,
                                child: TextField(
                                  controller: _controllers[index],
                                  focusNode: _focusNodes[index],
                                  textAlign: TextAlign.center,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    LengthLimitingTextInputFormatter(1),
                                    FilteringTextInputFormatter.digitsOnly,
                                  ],
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.goldDark,
                                  ),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: AppColors.backgroundSecondary,
                                    contentPadding: EdgeInsets.zero,
                                    isDense: true,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(color: AppColors.border),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(color: AppColors.goldPrimary, width: 2),
                                    ),
                                  ),
                                  onChanged: (value) {
                                    if (value.isNotEmpty && index < 5) {
                                      _focusNodes[index + 1].requestFocus();
                                    } else if (value.isEmpty && index > 0) {
                                      _focusNodes[index - 1].requestFocus();
                                    }
                                    if (_otpCode.length == 6 && !_isVerifying && !_isAutofilling) {
                                      _handleVerify();
                                    }
                                  },
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                    if (authState.hasError) ...[
                      const SizedBox(height: 16),
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
                      label: isAr ? 'تأكيد الرمز والدخول' : 'Verify & Continue',
                      icon: Icons.check_circle_outline_rounded,
                      isLoading: isLoading,
                      onPressed: isLoading ? null : _handleVerify,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Resend Timer Row
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_resendCountdown > 0)
                    Text(
                      isAr
                          ? 'إعادة إرسال الرمز بعد ($_resendCountdown ثانية)'
                          : 'Resend code in ($_resendCountdown s)',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 13,
                        fontFamily: 'Cairo',
                      ),
                    )
                  else
                    TextButton(
                      onPressed: isLoading ? null : _handleResend,
                      child: Text(
                        isAr ? 'إعادة إرسال رمز التحقق الآن' : 'Resend verification code now',
                        style: const TextStyle(
                          color: AppColors.goldDark,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

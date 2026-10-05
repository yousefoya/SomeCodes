import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../address/presentation/controllers/address_controller.dart';
import '../../address/presentation/screens/add_edit_address_screen.dart';
import '../../address/presentation/screens/saved_addresses_screen.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import '../../orders/domain/entities/order_entity.dart';
import '../../orders/presentation/controllers/orders_controller.dart';
import '../domain/entities/cart_item_entity.dart';
import 'controllers/cart_controller.dart';

/// Modern Premium Checkout & Order Confirmation Screen for بتنحل (btin7al)
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final TextEditingController _couponController = TextEditingController();
  final TextEditingController _orderNotesController = TextEditingController();

  String _selectedPaymentMethod = 'cash_on_delivery';
  bool _isSubmitting = false;
  String? _errorMessage;
  OrderEntity? _confirmedOrder;

  @override
  void dispose() {
    _couponController.dispose();
    _orderNotesController.dispose();
    super.dispose();
  }

  Future<void> _applyCoupon(bool isAr) async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;

    final success = await ref.read(cartControllerProvider.notifier).applyCouponAsync(code);
    if (!mounted) return;

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr
                ? 'كود الخصم غير صالح أو غير مفعّل'
                : 'Invalid or inactive coupon code',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr ? 'تم تطبيق كود الخصم بنجاح 🎉' : 'Coupon code applied successfully! 🎉',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  void _showAuthRequiredDialog(BuildContext context, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.lock_outline_rounded, color: AppColors.goldDark, size: 24),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isAr ? 'تسجيل الدخول مطلوب' : 'Login Required',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ),
          ],
        ),
        content: Text(
          isAr
              ? 'يرجى تسجيل الدخول أو إنشاء حساب جديد للمتابعة وإتمام طلبك وتتبعه بسهولة.'
              : 'Please log in or create an account to continue and place your order.',
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isAr ? 'متابعة التصفح' : 'Continue Browsing', style: const TextStyle(fontFamily: 'Cairo')),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.goldPrimary),
            icon: const Icon(Icons.login_rounded, size: 18),
            label: Text(
              isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Log In / Sign Up',
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w800),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              context.push(RoutePaths.login);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _placeOrder(bool isAr) async {
    if (_isSubmitting) return;

    final authState = ref.read(authControllerProvider);
    if (!authState.isAuthenticated) {
      _showAuthRequiredDialog(context, isAr);
      return;
    }

    final cart = ref.read(cartControllerProvider);
    final address = ref.read(selectedDeliveryAddressProvider);

    if (cart.isEmpty) return;

    if (address == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr ? 'يرجى تحديد أو إضافة عنوان التوصيل أولاً' : 'Please select a delivery address first',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.warning,
          action: SnackBarAction(
            label: isAr ? 'إضافة عنوان' : 'Add Address',
            textColor: Colors.white,
            onPressed: () => _openAddressSelection(context),
          ),
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      // Smooth visual feedback
      await Future<void>.delayed(const Duration(milliseconds: 500));

      final createdOrder = ref.read(ordersControllerProvider.notifier).placeOrder(
        cart: cart,
        address: address,
        notes: _orderNotesController.text.trim().isEmpty ? null : _orderNotesController.text.trim(),
      );

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _confirmedOrder = createdOrder;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().contains('تسجيل الدخول')
              ? (isAr ? 'يرجى تسجيل الدخول أولاً لإتمام الطلب' : 'Please log in first to place order')
              : (isAr
                  ? 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.'
                  : 'An error occurred while placing your order. Please try again.');
        });
      }
    }
  }

  void _openAddressSelection(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => const SavedAddressesScreen(isSelectionMode: true),
      ),
    );
  }

  void _openAddAddress(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => const AddEditAddressScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final cart = ref.watch(cartControllerProvider);
    final selectedAddress = ref.watch(selectedDeliveryAddressProvider);

    // If order has been confirmed, show dedicated modern Confirmation & Success View
    if (_confirmedOrder != null) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) {
            context.go(RoutePaths.orders);
          }
        },
        child: Scaffold(
          backgroundColor: AppColors.background,
          appBar: CustomAppBar(
            title: isAr ? 'تأكيد الطلب' : 'Order Confirmation',
            showBackButton: true,
            onBack: () => context.go(RoutePaths.orders),
          ),
          body: _buildOrderSuccessView(context, order: _confirmedOrder!, isAr: isAr),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'إتمام الطلب والدفع' : 'Checkout & Payment',
        showBackButton: true,
      ),
      body: cart.isEmpty
          ? EmptyView(
              title: isAr ? 'سلة الطلب فارغة' : 'Your Cart is Empty',
              message: isAr
                  ? 'لم تقم بإضافة أي خدمات أو منتجات للطلب بعد.'
                  : 'You have not added any services or products yet.',
              icon: Icons.shopping_cart_outlined,
              actionLabel: isAr ? 'تصفح الخدمات' : 'Browse Services',
              onAction: () => context.go(RoutePaths.home),
            )
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: AppColors.error, fontSize: 12, fontFamily: 'Cairo'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          // 1. Delivery Address Card
                          _buildSectionHeader(
                            title: isAr ? 'عنوان التوصيل' : 'Delivery Address',
                            icon: Icons.location_on_rounded,
                            actionLabel: selectedAddress != null ? (isAr ? 'تغيير' : 'Change') : null,
                            onAction: () => _openAddressSelection(context),
                          ),
                          const SizedBox(height: 8),
                          if (selectedAddress != null)
                            GoldGradientCard(
                              hasGoldBorder: true,
                              onTap: () => _openAddressSelection(context),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.home_rounded, color: AppColors.goldDark, size: 20),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              selectedAddress.title,
                                              style: const TextStyle(
                                                color: AppColors.textPrimary,
                                                fontWeight: FontWeight.w800,
                                                fontSize: 14,
                                                fontFamily: 'Cairo',
                                              ),
                                            ),
                                            if (selectedAddress.isDefault) ...[
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  isAr ? 'الافتراضي' : 'Default',
                                                  style: const TextStyle(
                                                    color: AppColors.goldDark,
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w700,
                                                    fontFamily: 'Cairo',
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          selectedAddress.fullAddressText,
                                          style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 12,
                                            fontFamily: 'Cairo',
                                            height: 1.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.goldDark, size: 14),
                                ],
                              ),
                            )
                          else
                            GoldGradientCard(
                              hasGoldBorder: true,
                              onTap: () => _openAddAddress(context),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.add_location_alt_rounded, color: AppColors.goldDark, size: 22),
                                  const SizedBox(width: 8),
                                  Text(
                                    isAr ? 'إضافة عنوان توصيل جديد' : 'Add Delivery Address',
                                    style: const TextStyle(
                                      color: AppColors.goldDark,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 20),

                          // 2. Order Items List
                          _buildSectionHeader(
                            title: isAr ? 'الخدمات والمنتجات المطلوبة' : 'Order Items',
                            icon: Icons.inventory_2_rounded,
                            badgeText: '${cart.items.length}',
                          ),
                          const SizedBox(height: 8),
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: cart.items.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final item = cart.items[index];
                              return _buildCartItemCard(context, item: item, isAr: isAr);
                            },
                          ),
                          const SizedBox(height: 20),

                          // 3. Discount Coupon
                          _buildSectionHeader(
                            title: isAr ? 'كوبون الخصم' : 'Promo Code',
                            icon: Icons.local_offer_rounded,
                          ),
                          const SizedBox(height: 8),
                          if (cart.couponCode != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppColors.goldPrimary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.4)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle_rounded, color: AppColors.goldDark, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '${isAr ? 'تم تطبيق كود' : 'Applied code'}: ${cart.couponCode} (-${cart.discountAmount.toStringAsFixed(2)} JOD)',
                                      style: const TextStyle(
                                        color: AppColors.goldDark,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.error),
                                    onPressed: () {
                                      ref.read(cartControllerProvider.notifier).removeCoupon();
                                    },
                                  ),
                                ],
                              ),
                            )
                          else
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _couponController,
                                    textCapitalization: TextCapitalization.characters,
                                    decoration: InputDecoration(
                                      hintText: isAr ? 'أدخل كود الخصم الترويجي' : 'Enter promo code',
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: () => _applyCoupon(isAr),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.goldPrimary,
                                    foregroundColor: Colors.white,
                                    minimumSize: const Size(80, 48),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  child: Text(
                                    isAr ? 'تطبيق' : 'Apply',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                                  ),
                                ),
                              ],
                            ),
                          const SizedBox(height: 20),

                          // 4. Payment Method Selection
                          _buildSectionHeader(
                            title: isAr ? 'طريقة الدفع' : 'Payment Method',
                            icon: Icons.payment_rounded,
                          ),
                          const SizedBox(height: 8),
                          _buildPaymentOption(
                            id: 'cash_on_delivery',
                            title: isAr ? 'الدفع نقداً عند الاستلام' : 'Cash on Delivery',
                            subtitle: isAr ? 'ادفع للسائق أو الفني مباشرة بعد إتمام الخدمة' : 'Pay in cash upon completion',
                            icon: Icons.payments_outlined,
                            isSelected: _selectedPaymentMethod == 'cash_on_delivery',
                          ),
                          const SizedBox(height: 8),
                          _buildPaymentOption(
                            id: 'wallet',
                            title: isAr ? 'محفظة بتنحل الإلكترونية (قريباً)' : 'btin7al Wallet (Coming Soon)',
                            subtitle: isAr ? 'الرصيد المتاح: 25.00 JOD' : 'Available balance: 25.00 JOD',
                            icon: Icons.account_balance_wallet_outlined,
                            isSelected: _selectedPaymentMethod == 'wallet',
                            enabled: false,
                          ),
                          const SizedBox(height: 20),

                          // 5. Order Notes / Special Instructions
                          _buildSectionHeader(
                            title: isAr ? 'ملاحظات وتوجيهات إضافية' : 'Order Notes (Optional)',
                            icon: Icons.edit_note_rounded,
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _orderNotesController,
                            maxLines: 2,
                            decoration: InputDecoration(
                              hintText: isAr
                                  ? 'أي تعليمات خاصة للمندوب أو الفني (مثال: يرجي الاتصال عند الوصول)...'
                                  : 'Any instructions for delivery team...',
                              contentPadding: const EdgeInsets.all(12),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // 6. Detailed Price Breakdown
                          _buildSectionHeader(
                            title: isAr ? 'تفاصيل الفاتورة والمجموع' : 'Price Breakdown',
                            icon: Icons.receipt_long_rounded,
                          ),
                          const SizedBox(height: 8),
                          GoldGradientCard(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                _buildPriceRow(
                                  isAr ? 'مجموع المنتجات والخدمات' : 'Subtotal',
                                  '${cart.subtotal.toStringAsFixed(2)} JOD',
                                ),
                                const SizedBox(height: 8),
                                _buildPriceRow(
                                  isAr ? 'رسوم التوصيل' : 'Delivery Fee',
                                  isAr ? '0.00 JOD (مجاناً)' : '0.00 JOD (Free)',
                                  isFree: true,
                                ),
                                if (cart.discountAmount > 0) ...[
                                  const SizedBox(height: 8),
                                  _buildPriceRow(
                                    isAr ? 'قيمة الخصم' : 'Discount',
                                    '- ${cart.discountAmount.toStringAsFixed(2)} JOD',
                                    isDiscount: true,
                                  ),
                                ],
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 12),
                                  child: Divider(color: AppColors.border),
                                ),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      isAr ? 'المجموع الكلي المطلوب:' : 'Total Amount:',
                                      style: const TextStyle(
                                        color: AppColors.textPrimary,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w900,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                    Text(
                                      '${cart.totalAmount.toStringAsFixed(2)} JOD',
                                      style: const TextStyle(
                                        color: AppColors.goldDark,
                                        fontSize: 19,
                                        fontWeight: FontWeight.w900,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          if (!ref.watch(authControllerProvider).isAuthenticated) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.goldPrimary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.4)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.lock_outline_rounded, color: AppColors.goldDark, size: 24),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          isAr ? 'تسجيل الدخول مطلوب لإتمام الطلب' : 'Login Required to Place Order',
                                          style: const TextStyle(
                                            color: AppColors.goldDark,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                            fontFamily: 'Cairo',
                                          ),
                                        ),
                                        Text(
                                          isAr
                                              ? 'أنت تتصفح كزائر. يرجى تسجيل الدخول أو إنشاء حساب جديد لتأكيد طلبك وتتبعه.'
                                              : 'You are browsing as a guest. Please log in or create an account to proceed.',
                                          style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 11,
                                            fontFamily: 'Cairo',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => context.push(RoutePaths.login),
                                    child: Text(
                                      isAr ? 'دخول' : 'Log In',
                                      style: const TextStyle(
                                        color: AppColors.goldDark,
                                        fontWeight: FontWeight.w900,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action Bar
                  Container(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border(
                        top: BorderSide(color: AppColors.border.withValues(alpha: 0.8)),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, -3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                isAr ? 'المبلغ الإجمالي' : 'Total Amount',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              Text(
                                '${cart.totalAmount.toStringAsFixed(2)} JOD',
                                style: const TextStyle(
                                  color: AppColors.goldDark,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: CustomButton(
                            label: !ref.watch(authControllerProvider).isAuthenticated
                                ? (isAr ? 'تسجيل الدخول للمتابعة' : 'Log In to Place Order')
                                : (isAr ? 'تأكيد وإرسال الطلب' : 'Place Order'),
                            icon: !ref.watch(authControllerProvider).isAuthenticated
                                ? Icons.login_rounded
                                : Icons.check_circle_outline_rounded,
                            isLoading: _isSubmitting,
                            onPressed: _isSubmitting ? null : () => _placeOrder(isAr),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    required IconData icon,
    String? badgeText,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: AppColors.goldDark),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w800,
                fontFamily: 'Cairo',
              ),
            ),
            if (badgeText != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.goldPrimary.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  badgeText,
                  style: const TextStyle(
                    color: AppColors.goldDark,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
            ],
          ],
        ),
        if (actionLabel != null && onAction != null)
          GestureDetector(
            onTap: onAction,
            child: Text(
              actionLabel,
              style: const TextStyle(
                color: AppColors.goldDark,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                fontFamily: 'Cairo',
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildCartItemCard(
    BuildContext context, {
    required CartItemEntity item,
    required bool isAr,
  }) {
    return GoldGradientCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Icon(
              item.isHomeService ? Icons.home_repair_service_rounded : Icons.local_shipping_rounded,
              color: AppColors.goldDark,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAr ? item.serviceNameAr : item.serviceNameEn,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${item.unitPrice.toStringAsFixed(2)} JOD × ${item.quantity}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ),
          // Stepper Buttons
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline_rounded, color: AppColors.goldDark, size: 20),
                onPressed: () {
                  ref.read(cartControllerProvider.notifier).decrementQuantity(item.id);
                },
              ),
              Text(
                '${item.quantity}',
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  fontFamily: 'Cairo',
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.goldDark, size: 20),
                onPressed: () {
                  ref.read(cartControllerProvider.notifier).incrementQuantity(item.id);
                },
              ),
            ],
          ),
          const SizedBox(width: 4),
          Text(
            '${item.itemTotal.toStringAsFixed(2)} JOD',
            style: const TextStyle(
              color: AppColors.goldDark,
              fontWeight: FontWeight.w900,
              fontSize: 13,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    bool enabled = true,
  }) {
    return Opacity(
      opacity: enabled ? 1.0 : 0.6,
      child: GoldGradientCard(
        hasGoldBorder: isSelected,
        onTap: enabled
            ? () {
                setState(() => _selectedPaymentMethod = id);
              }
            : null,
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: isSelected ? AppColors.goldDark : AppColors.textMuted,
              size: 20,
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppColors.goldDark, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      fontFamily: 'Cairo',
                    ),
                  ),
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
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isFree = false, bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            fontFamily: 'Cairo',
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: isFree
                ? AppColors.success
                : isDiscount
                    ? AppColors.error
                    : AppColors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 13,
            fontFamily: 'Cairo',
          ),
        ),
      ],
    );
  }

  Widget _buildOrderSuccessView(
    BuildContext context, {
    required OrderEntity order,
    required bool isAr,
  }) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppColors.goldGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.goldPrimary.withValues(alpha: 0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(Icons.check_rounded, color: Colors.white, size: 48),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isAr ? 'تم استلام وتأكيد طلبك بنجاح! 🎉' : 'Order Placed Successfully! 🎉',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w900,
                fontFamily: 'Cairo',
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.goldPrimary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.3)),
              ),
              child: Text(
                '${isAr ? 'رقم الطلب' : 'Order ID'}: ${order.id}',
                style: const TextStyle(
                  color: AppColors.goldDark,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  fontFamily: 'Cairo',
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              isAr
                  ? 'تم توجيه طلبك بنجاح إلى فريق ومزودي منصة بتنحل في منطقتك (${order.deliveryAddress.area}). سنقوم بإرسال إشعارات لحظية بمراحل التوصيل والتنفيذ.'
                  : 'Your order has been routed to the service team in ${order.deliveryAddress.area}. You will receive real-time delivery tracking.',
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontFamily: 'Cairo',
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Order Receipt Card
            GoldGradientCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isAr ? 'ملخص الفاتورة والطلب' : 'Order Receipt',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isAr ? 'قيد المتابعة' : 'Pending',
                          style: const TextStyle(
                            color: AppColors.warning,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: AppColors.border),
                  ...order.items.map((it) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${it.quantity}x ${isAr ? it.serviceNameAr : it.serviceNameEn}',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            Text(
                              '${it.totalPrice.toStringAsFixed(2)} JOD',
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                        ),
                      )),
                  const Divider(height: 20, color: AppColors.border),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isAr ? 'المجموع الإجمالي' : 'Total Paid / Due',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      Text(
                        '${order.totalAmount.toStringAsFixed(2)} JOD',
                        style: const TextStyle(
                          color: AppColors.goldDark,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),

            // Action CTAs
            CustomButton(
              label: isAr ? 'عرض وتتبع الطلب في طلباتي' : 'View & Track Order',
              icon: Icons.receipt_long_rounded,
              onPressed: () => context.go(RoutePaths.orders),
            ),
            const SizedBox(height: 12),
            CustomButton(
              label: isAr ? 'العودة للرئيسية ومتابعة التسوق' : 'Back to Home',
              icon: Icons.home_rounded,
              variant: ButtonVariant.outline,
              onPressed: () => context.go(RoutePaths.home),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

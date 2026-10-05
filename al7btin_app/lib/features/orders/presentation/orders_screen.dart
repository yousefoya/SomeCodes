import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import 'controllers/orders_controller.dart';

/// Orders Screen displaying customer's dynamic placed orders and history with guest protection
class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final authState = ref.watch(authControllerProvider);
    final isAuthenticated = authState.isAuthenticated;
    final currentUserId = authState.user?.id;
    final allOrders = ref.watch(ordersControllerProvider);

    // Filter orders belonging to the logged-in customer
    final customerOrders = allOrders.where((o) {
      if (currentUserId == null) return false;
      return o.customerId == currentUserId || o.customerPhone == authState.user?.phoneNumber;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'طلباتي' : 'My Orders',
        showBackButton: false,
      ),
      body: SafeArea(
        child: !isAuthenticated
            ? EmptyView(
                title: isAr ? 'تسجيل الدخول مطلوب' : 'Login Required',
                message: isAr
                    ? 'يرجى تسجيل الدخول أو إنشاء حساب جديد للوصول إلى سجل طلباتك وتتبعها مباشرة.'
                    : 'Please log in or create an account to view and track your order history.',
                icon: Icons.lock_outline_rounded,
                actionLabel: isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Log In / Sign Up',
                onAction: () => context.push(RoutePaths.login),
              )
            : customerOrders.isEmpty
                ? EmptyView(
                    title: isAr ? 'لا توجد طلبات سابقة' : 'No Orders Yet',
                    message: isAr
                        ? 'لم تقم بطلب أي خدمات أو منتجات بعد. تصفح الخدمات وابدأ طلبك الأول الآن!'
                        : 'You haven\'t placed any orders yet. Browse services and place your first order!',
                    icon: Icons.receipt_long_outlined,
                    actionLabel: isAr ? 'تصفح الخدمات' : 'Browse Services',
                    onAction: () => context.go(RoutePaths.home),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    itemCount: customerOrders.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final order = customerOrders[index];
                      final isActive = order.isActive;

                      return GoldGradientCard(
                        hasGoldBorder: isActive,
                        onTap: () => context.push(RoutePaths.orderTrackingPath(order.id)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  order.id,
                                  style: const TextStyle(
                                    color: AppColors.goldDark,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isActive
                                        ? AppColors.goldPrimary.withValues(alpha: 0.16)
                                        : AppColors.backgroundSecondary,
                                    borderRadius: AppDimensions.borderRadiusSm,
                                    border: Border.all(
                                      color: isActive ? AppColors.goldPrimary : AppColors.border,
                                    ),
                                  ),
                                  child: Text(
                                    isAr ? order.status.getLabelAr() : order.status.getLabelEn(),
                                    style: TextStyle(
                                      color: isActive ? AppColors.goldDark : AppColors.textSecondary,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              isAr ? order.primaryItemTitleAr : order.primaryItemTitleEn,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '${order.deliveryAddress.city} - ${order.deliveryAddress.area}',
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 12,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${order.createdAt.year}/${order.createdAt.month.toString().padLeft(2, '0')}/${order.createdAt.day.toString().padLeft(2, '0')} - ${order.paymentMethod}',
                                  style: const TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 11,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                                Text(
                                  '${order.totalAmount.toStringAsFixed(2)} JOD',
                                  style: const TextStyle(
                                    color: AppColors.goldDark,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../data/repositories/quotations_repository.dart';
import '../domain/entities/order_entity.dart';
import '../domain/entities/quotation_entity.dart';
import 'controllers/orders_controller.dart';

/// Real-time Order Tracking Screen displaying direct Provider fulfillment status,
/// customer delivery location coordinates, quotations, and ordered items breakdown.
class OrderTrackingScreen extends ConsumerWidget {
  final String orderId;

  const OrderTrackingScreen({
    super.key,
    required this.orderId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final orders = ref.watch(ordersControllerProvider);
    final order = orders.where((o) => o.id == orderId).firstOrNull;
    final quotationsAsync = ref.watch(orderQuotationsProvider(orderId));

    if (order == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: CustomAppBar(
          title: isAr ? 'تتبع الطلب' : 'Track Order',
          showBackButton: true,
          onBack: () => context.pop(),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppDimensions.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.receipt_long_outlined, size: 54, color: AppColors.textMuted),
                const SizedBox(height: 16),
                Text(
                  isAr ? 'الطلب غير موجود أو جارٍ تحميله' : 'Order not found or loading',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 24),
                CustomButton(
                  label: isAr ? 'العودة لسجل الطلبات' : 'Back to Orders',
                  variant: ButtonVariant.outline,
                  onPressed: () => context.go(RoutePaths.orders),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'تتبع الطلب #${order.id}' : 'Track Order #${order.id}',
        showBackButton: true,
        onBack: () => context.pop(),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Status Hero Banner
              _buildStatusBanner(context, order, isAr),
              const SizedBox(height: 16),

              // Provider Quotation Review Card (if available)
              quotationsAsync.when(
                data: (quotes) {
                  if (quotes.isEmpty) return const SizedBox.shrink();
                  return Column(
                    children: [
                      ...quotes.map((q) => _buildQuotationCard(context, ref, q, isAr)),
                      const SizedBox(height: 16),
                    ],
                  );
                },
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),

              // Timeline Progress
              _buildTimelineCard(order, isAr),
              const SizedBox(height: 16),

              // Provider Information Card
              _buildProviderCard(order, isAr),
              const SizedBox(height: 16),

              // Delivery Address & Location Coordinates Card
              _buildLocationCard(order, isAr),
              const SizedBox(height: 16),

              // Completed Order Review / Rating Section
              if (order.status == OrderStatus.completed) ...[
                _buildReviewSection(context, ref, order, isAr),
                const SizedBox(height: 16),
              ],

              // Items and Pricing Summary Card
              _buildSummaryCard(order, isAr),
              const SizedBox(height: 24),

              // Action Buttons: Cancel Order (if cancellable) & Back to Orders
              if (order.status == OrderStatus.pending ||
                  order.status == OrderStatus.confirmed ||
                  order.status == OrderStatus.awaitingAssignment ||
                  order.status == OrderStatus.offeredToDriver) ...[
                CustomButton(
                  label: isAr ? 'إلغاء الطلب' : 'Cancel Order',
                  variant: ButtonVariant.outline,
                  icon: Icons.cancel_outlined,
                  onPressed: () => _showCancelDialog(context, ref, order, isAr),
                ),
                const SizedBox(height: 12),
              ],

              CustomButton(
                label: isAr ? 'العودة إلى سجل الطلبات' : 'Back to Orders List',
                variant: ButtonVariant.outline,
                icon: Icons.receipt_long_rounded,
                onPressed: () => context.go(RoutePaths.orders),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBanner(BuildContext context, OrderEntity order, bool isAr) {
    Color bannerColor;
    IconData bannerIcon;
    String statusTitle;
    String statusDesc;

    switch (order.status) {
      case OrderStatus.confirmed:
      case OrderStatus.pending:
      case OrderStatus.offeredToDriver:
      case OrderStatus.awaitingAssignment:
      case OrderStatus.assigned:
        bannerColor = AppColors.goldDark;
        bannerIcon = Icons.access_time_rounded;
        statusTitle = isAr ? 'تم استلام وتأكيد طلبك' : 'Order Received & Confirmed';
        statusDesc = isAr
            ? 'تم إرسال الطلب للمزود المعتمد للبدء في التجهيز.'
            : 'Order has been sent to the authorized provider for preparation.';
        break;
      case OrderStatus.accepted:
        bannerColor = const Color(0xFF2563EB);
        bannerIcon = Icons.inventory_2_outlined;
        statusTitle = isAr ? 'جارٍ تجهيز الطلب من المزود' : 'Provider is Preparing Order';
        statusDesc = isAr
            ? 'المزود (${order.providerName ?? "مزود الخدمة"}) يقوم بتجهيز طلبك حالياً.'
            : 'Provider (${order.providerName ?? "Provider"}) is preparing your items.';
        break;
      case OrderStatus.goingToPickup:
      case OrderStatus.pickedUp:
      case OrderStatus.goingToCustomer:
        bannerColor = const Color(0xFFD97706);
        bannerIcon = Icons.local_shipping_outlined;
        statusTitle = isAr ? 'المزود في طريق التوصيل إليك' : 'Provider Out for Delivery';
        statusDesc = isAr
            ? 'طلبك في الطريق مع كادر المزود للعنوان المحدد.'
            : 'Your order is out for delivery with the provider staff.';
        break;
      case OrderStatus.completed:
        bannerColor = const Color(0xFF16A34A);
        bannerIcon = Icons.check_circle_outline_rounded;
        statusTitle = isAr ? 'تم تسليم الطلب بنجاح' : 'Order Delivered Successfully';
        statusDesc = isAr
            ? 'شكراً لتعاملك مع بتنحل! نتمنى لك تجربة ممتعة.'
            : 'Thank you for ordering with btin7al!';
        break;
      case OrderStatus.cancelled:
      case OrderStatus.rejected:
      case OrderStatus.failed:
        bannerColor = const Color(0xFFDC2626);
        bannerIcon = Icons.cancel_outlined;
        statusTitle = isAr ? 'تم إلغاء الطلب' : 'Order Cancelled';
        statusDesc = isAr
            ? 'تعذر إتمام الطلب أو تم إلغاؤه.'
            : 'The order was cancelled or could not be completed.';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bannerColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: bannerColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: bannerColor.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(bannerIcon, color: bannerColor, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusTitle,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: bannerColor,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  statusDesc,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineCard(OrderEntity order, bool isAr) {
    final currentStep = _getStepIndex(order.status);

    final steps = [
      {'title': isAr ? 'تأكيد الطلب' : 'Confirmed', 'desc': isAr ? 'تم إنشاء الطلب بنجاح' : 'Order Placed'},
      {'title': isAr ? 'قبول وتجهيز المزود' : 'Provider Prep', 'desc': isAr ? 'المزود يجهز طلبك' : 'Preparing Items'},
      {'title': isAr ? 'في طريق التوصيل' : 'Out for Delivery', 'desc': isAr ? 'المزود متوجه إليك' : 'On the Way'},
      {'title': isAr ? 'تم التسليم' : 'Delivered', 'desc': isAr ? 'تسليم الطلب بنجاح' : 'Order Completed'},
    ];

    return GoldGradientCard(
      hasGoldBorder: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline_rounded, color: AppColors.goldDark, size: 20),
              const SizedBox(width: 8),
              Text(
                isAr ? 'مراحل تنفيذ وتوصيل الطلب' : 'Fulfillment & Delivery Timeline',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Column(
            children: List.generate(steps.length, (index) {
              final isDone = currentStep > index;
              final isCurrent = currentStep == index;
              final isLast = index == steps.length - 1;

              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isDone
                                ? const Color(0xFF16A34A)
                                : isCurrent
                                    ? AppColors.goldDark
                                    : AppColors.backgroundSecondary,
                            border: Border.all(
                              color: isDone
                                  ? const Color(0xFF16A34A)
                                  : isCurrent
                                      ? AppColors.goldPrimary
                                      : AppColors.border,
                              width: 2,
                            ),
                          ),
                          child: Icon(
                            isDone
                                ? Icons.check
                                : isCurrent
                                    ? Icons.circle
                                    : Icons.circle_outlined,
                            size: 14,
                            color: isDone || isCurrent ? Colors.white : AppColors.textMuted,
                          ),
                        ),
                        if (!isLast)
                          Expanded(
                            child: Container(
                              width: 2,
                              color: isDone ? const Color(0xFF16A34A) : AppColors.border,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              steps[index]['title']!,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w700,
                                color: isCurrent
                                    ? AppColors.goldDark
                                    : isDone
                                        ? AppColors.textPrimary
                                        : AppColors.textMuted,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              steps[index]['desc']!,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  int _getStepIndex(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
      case OrderStatus.confirmed:
      case OrderStatus.offeredToDriver:
      case OrderStatus.awaitingAssignment:
      case OrderStatus.assigned:
        return 0;
      case OrderStatus.accepted:
        return 1;
      case OrderStatus.goingToPickup:
      case OrderStatus.pickedUp:
      case OrderStatus.goingToCustomer:
        return 2;
      case OrderStatus.completed:
        return 3;
      case OrderStatus.cancelled:
      case OrderStatus.rejected:
      case OrderStatus.failed:
        return -1;
    }
  }

  Widget _buildProviderCard(OrderEntity order, bool isAr) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.storefront_rounded, color: AppColors.goldDark, size: 20),
              const SizedBox(width: 8),
              Text(
                isAr ? 'المزود المسؤول عن التنفيذ والتوصيل' : 'Fulfilling Provider Details',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Cairo',
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.goldPrimary.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.store_rounded, color: AppColors.goldDark, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.providerName ?? (isAr ? 'مزود معتمد لدى بتنحل' : 'Authorized btin7al Provider'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        fontFamily: 'Cairo',
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '📞 ${order.providerPhone ?? "0790000000"}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLocationCard(OrderEntity order, bool isAr) {
    final addr = order.deliveryAddress;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.location_on_rounded, color: AppColors.goldDark, size: 20),
              const SizedBox(width: 8),
              Text(
                isAr ? 'موقع وعنوان التوصيل' : 'Delivery Address & Location',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Cairo',
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          Text(
            addr.fullAddressText,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              fontFamily: 'Cairo',
              color: AppColors.textPrimary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.gps_fixed_rounded, size: 14, color: AppColors.goldDark),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'GPS: ${addr.location.latitude.toStringAsFixed(5)}, ${addr.location.longitude.toStringAsFixed(5)}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textMuted,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (order.destinationAddress != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 16),
            Row(
              children: [
                const Icon(Icons.directions_car_rounded, color: AppColors.goldDark, size: 18),
                const SizedBox(width: 6),
                Text(
                  isAr ? 'وجهة نقل / سحب المركبة' : 'Vehicle Destination',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              order.destinationAddress!,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                fontFamily: 'Cairo',
                color: AppColors.textSecondary,
              ),
            ),
            if (order.tripDistanceKm != null) ...[
              const SizedBox(height: 4),
              Text(
                isAr ? 'مسافة الرحلة المقدرة: ${order.tripDistanceKm} كم' : 'Trip Distance: ${order.tripDistanceKm} km',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Cairo',
                  color: AppColors.goldDark,
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryCard(OrderEntity order, bool isAr) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long_rounded, color: AppColors.goldDark, size: 20),
              const SizedBox(width: 8),
              Text(
                isAr ? 'تفاصيل المنتجات والفاتورة' : 'Items & Invoice Summary',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Cairo',
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          ...order.items.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${item.quantity}x ${isAr ? item.serviceNameAr : item.serviceNameEn}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Cairo',
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Text(
                    '${item.totalPrice.toStringAsFixed(2)} JOD',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            );
          }),
          const Divider(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isAr ? 'رسوم التوصيل' : 'Delivery Fee',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontFamily: 'Cairo',
                ),
              ),
              Text(
                isAr ? '0.00 د.أ (مجاني)' : '0.00 JOD (Free)',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF16A34A),
                  fontFamily: 'Cairo',
                ),
              ),
            ],
          ),
          if (order.discount > 0) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isAr ? 'الخصم' : 'Discount',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF16A34A),
                    fontFamily: 'Cairo',
                  ),
                ),
                Text(
                  '-${order.discount.toStringAsFixed(2)} JOD',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ],
          const Divider(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isAr ? 'المبلغ الإجمالي' : 'Total Amount',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${order.totalAmount.toStringAsFixed(2)} JOD',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: AppColors.goldDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuotationCard(BuildContext context, WidgetRef ref, QuotationEntity quotation, bool isAr) {
    final isPending = quotation.status == QuotationStatus.sent;
    final isApproved = quotation.status == QuotationStatus.customerApproved;
    final isRejected = quotation.status == QuotationStatus.customerRejected;

    Color badgeBg;
    Color badgeColor;
    if (isApproved) {
      badgeBg = const Color(0xFFDCFCE7); // green-100
      badgeColor = const Color(0xFF16A34A);
    } else if (isRejected) {
      badgeBg = const Color(0xFFFEE2E2); // red-100
      badgeColor = const Color(0xFFDC2626);
    } else {
      badgeBg = const Color(0xFFFEF3C7); // amber-100
      badgeColor = const Color(0xFFD97706);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending ? AppColors.goldPrimary : AppColors.border,
          width: isPending ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.request_quote_rounded, color: AppColors.goldDark, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    isAr ? 'عرض سعر الصيانة الإضافي' : 'Additional Quotation',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isAr ? quotation.status.labelAr : quotation.status.labelEn,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: badgeColor,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
            ],
          ),
          if (quotation.notes != null && quotation.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              quotation.notes!,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontFamily: 'Cairo',
              ),
            ),
          ],
          const Divider(height: 20),

          // Itemized lines
          if (quotation.items.isNotEmpty) ...[
            ...quotation.items.map((it) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.goldLight.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              isAr ? it.itemType.labelAr : it.itemType.labelEn,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppColors.goldDark,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isAr ? it.descriptionAr : it.descriptionEn,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${it.totalPrice.toStringAsFixed(2)} JOD',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              );
            }),
            const Divider(height: 16),
          ],

          // Total Quotation Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isAr ? 'إجمالي عرض السعر' : 'Quotation Total',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${quotation.totalAmount.toStringAsFixed(2)} JOD',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: AppColors.goldDark,
                ),
              ),
            ],
          ),

          // Customer Approval Actions
          if (isPending) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: CustomButton(
                    label: isAr ? 'قبول عرض السعر' : 'Approve Quotation',
                    icon: Icons.check_circle_outline_rounded,
                    onPressed: () async {
                      try {
                        await ref.read(quotationsRepositoryProvider).approveQuotation(quotation.id);
                        ref.invalidate(orderQuotationsProvider(quotation.orderId));
                        ref.invalidate(ordersControllerProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isAr ? 'تمت الموافقة على عرض السعر بنجاح وتحديث إجمالي الطلب.' : 'Quotation approved successfully.'),
                              backgroundColor: const Color(0xFF16A34A),
                            ),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(e.toString()),
                              backgroundColor: AppColors.error,
                            ),
                          );
                        }
                      }
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: CustomButton(
                    label: isAr ? 'رفض' : 'Reject',
                    variant: ButtonVariant.outline,
                    onPressed: () async {
                      try {
                        await ref.read(quotationsRepositoryProvider).rejectQuotation(quotation.id);
                        ref.invalidate(orderQuotationsProvider(quotation.orderId));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isAr ? 'تم رفض عرض السعر.' : 'Quotation rejected.'),
                              backgroundColor: AppColors.textSecondary,
                            ),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(e.toString()),
                              backgroundColor: AppColors.error,
                            ),
                          );
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildReviewSection(BuildContext context, WidgetRef ref, OrderEntity order, bool isAr) {
    final hasReviewed = order.rating != null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.star_rounded, color: Color(0xFFEAB308), size: 22),
              const SizedBox(width: 8),
              Text(
                hasReviewed
                    ? (isAr ? 'تقييمك للخدمة والمزود' : 'Your Rating & Review')
                    : (isAr ? 'شاركنا تقييمك للخدمة' : 'Rate Your Experience'),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  color: Color(0xFF166534),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (hasReviewed) ...[
            Row(
              children: List.generate(5, (index) {
                return Icon(
                  index < (order.rating ?? 5).floor()
                      ? Icons.star_rounded
                      : Icons.star_border_rounded,
                  color: const Color(0xFFEAB308),
                  size: 20,
                );
              }),
            ),
            if (order.reviewComment != null && order.reviewComment!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                order.reviewComment!,
                style: const TextStyle(
                  fontSize: 12,
                  fontFamily: 'Cairo',
                  color: Color(0xFF166534),
                ),
              ),
            ],
          ] else ...[
            Text(
              isAr
                  ? 'رأيك يهمنا لمساعدتنا في تحسين جودة المزودين والخدمات على مدار الساعة.'
                  : 'Your feedback helps us maintain high quality service.',
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'Cairo',
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            CustomButton(
              label: isAr ? 'إضافة تقييم للطلب' : 'Add Rating & Review',
              icon: Icons.rate_review_outlined,
              height: AppDimensions.buttonHeightSm,
              onPressed: () => _showReviewDialog(context, ref, order, isAr),
            ),
          ],
        ],
      ),
    );
  }

  void _showReviewDialog(BuildContext context, WidgetRef ref, OrderEntity order, bool isAr) {
    double selectedRating = 5.0;
    final commentController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text(
                isAr ? 'تقييم الخدمة والمزود' : 'Rate Order & Provider',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  fontSize: 16,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starValue = index + 1.0;
                      return IconButton(
                        icon: Icon(
                          starValue <= selectedRating ? Icons.star_rounded : Icons.star_border_rounded,
                          color: const Color(0xFFEAB308),
                          size: 32,
                        ),
                        onPressed: () {
                          setDialogState(() {
                            selectedRating = starValue;
                          });
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: isAr ? 'أضف تعليقك حول جودة الخدمة وسرعة الاستجابة (اختياري)...' : 'Add your review comments (optional)...',
                      hintStyle: const TextStyle(fontSize: 12, fontFamily: 'Cairo'),
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: Text(isAr ? 'إلغاء' : 'Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.goldDark,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    ref.read(ordersControllerProvider.notifier).submitReview(
                          order.id,
                          rating: selectedRating,
                          comment: commentController.text.trim().isEmpty ? null : commentController.text.trim(),
                        );
                    Navigator.of(ctx).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(isAr ? 'شكراً لك! تم تسجيل تقييمك بنجاح.' : 'Thank you! Review submitted successfully.'),
                        backgroundColor: const Color(0xFF16A34A),
                      ),
                    );
                  },
                  child: Text(isAr ? 'إرسال التقييم' : 'Submit Review'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showCancelDialog(BuildContext context, WidgetRef ref, OrderEntity order, bool isAr) {
    final reasonController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
              const SizedBox(width: 8),
              Text(
                isAr ? 'تأكيد إلغاء الطلب' : 'Confirm Order Cancellation',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  fontSize: 16,
                  color: AppColors.error,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isAr
                    ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟'
                    : 'Are you sure you want to cancel this order?',
                style: const TextStyle(
                  fontSize: 13,
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: isAr ? 'سبب الإلغاء (اختياري)...' : 'Reason for cancellation (optional)...',
                  hintStyle: const TextStyle(fontSize: 12, fontFamily: 'Cairo'),
                  filled: true,
                  fillColor: AppColors.backgroundSecondary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(isAr ? 'تراجع' : 'Keep Order'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                ref.read(ordersControllerProvider.notifier).cancelOrder(
                      order.id,
                      reason: reasonController.text.trim().isEmpty ? null : reasonController.text.trim(),
                    );
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isAr ? 'تم إلغاء الطلب بنجاح.' : 'Order cancelled successfully.'),
                    backgroundColor: AppColors.error,
                  ),
                );
              },
              child: Text(isAr ? 'تأكيد الإلغاء' : 'Confirm Cancel'),
            ),
          ],
        );
      },
    );
  }
}


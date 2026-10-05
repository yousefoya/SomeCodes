import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/routing/route_paths.dart';
import '../../../../core/widgets/custom_app_bar.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../checkout/domain/entities/cart_item_entity.dart';
import '../../../checkout/presentation/controllers/cart_controller.dart';
import '../controllers/dynamic_service_controller.dart';
import '../widgets/dynamic_form_renderer.dart';

/// Metadata-Driven Dynamic Service Screen
class DynamicServiceScreen extends ConsumerWidget {
  final String serviceId;

  const DynamicServiceScreen({
    super.key,
    required this.serviceId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final dynamicState = ref.watch(dynamicServiceProvider(serviceId));
    final dynamicNotifier = ref.read(dynamicServiceProvider(serviceId).notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'طلب الخدمة' : 'Service Request',
        showBackButton: true,
      ),
      body: dynamicState.configAsync.when(
        loading: () => LoadingView(
          message: isAr ? 'جاري تجهيز استمارة الخدمة...' : 'Loading dynamic service form...',
        ),
        error: (err, _) => ErrorView(
          message: isAr
              ? 'تعذر تحميل إعدادات الخدمة. يرجى المحاولة مرة أخرى.'
              : 'Failed to load service configuration.',
          onRetry: () => ref.refresh(dynamicServiceProvider(serviceId)),
        ),
        data: (config) {
          final service = config.service;
          final quote = dynamicState.quote;
          final totalAmount = quote?.total ?? service.basePrice;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppDimensions.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Service Hero Header Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
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
                          Expanded(
                            child: Text(
                              isAr ? service.nameAr : service.nameEn,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'SLA: ${config.slaHours} ${isAr ? 'ساعة' : 'hrs'}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (service.descriptionAr.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          isAr ? service.descriptionAr : service.descriptionEn,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Starting Labor Fee & Material Disclaimer Banner (Configurable from Admin)
                if (service.isLaborOnly || service.disclaimerText != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB), // Amber-50
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCD34D), width: 1.2), // Amber-300
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.info_outline_rounded, color: Color(0xFFB45309), size: 20),
                            const SizedBox(width: 8),
                            Text(
                              isAr
                                  ? 'أجرة اليد المبدئية: ${service.laborStartingPrice.toStringAsFixed(2)} د.أ'
                                  : 'Starting Labor Charge: ${service.laborStartingPrice.toStringAsFixed(2)} JOD',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFB45309),
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          service.disclaimerText ??
                              (isAr
                                  ? 'السعر الظاهر هو أجرة اليد/الخدمة الأساسية فقط، ولا يشمل قطع الغيار أو المواد أو المعدات أو أي أعمال إضافية قد تكون مطلوبة.'
                                  : 'The displayed price is the starting labor charge only, and does not include spare parts, materials, equipment, or any additional work.'),
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF92400E),
                            height: 1.4,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // 2. Reactive Alerts Banner
                if (dynamicState.activeAlerts.isNotEmpty) ...[
                  ...dynamicState.activeAlerts.map((alert) {
                    final message = isAr
                        ? alert['messageAr']?.toString()
                        : (alert['messageEn']?.toString() ?? alert['messageAr']?.toString());

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              message ?? '',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.amber.shade900,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],

                // 3. Dynamic Form Fields (Only Visible Fields)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAr ? 'تفاصيل ومتطلبات الطلب' : 'Order Details & Inputs',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...config.fields
                          .where((f) => dynamicState.visibleFields.contains(f.key))
                          .map((f) => DynamicFormFieldWidget(
                                field: f,
                                value: dynamicState.answers[f.key],
                                onChanged: (val) => dynamicNotifier.updateAnswer(f.key, val),
                                isAr: isAr,
                              )),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 4. Authoritative Server Pricing Breakdown Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isAr ? 'تفاصيل السعر التلقائي' : 'Price Breakdown',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (dynamicState.isCalculatingPrice)
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Itemized Breakdown Lines
                      if (quote != null && quote.breakdown.isNotEmpty) ...[
                        ...quote.breakdown.map((b) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isAr ? b.titleAr : b.titleEn,
                                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                  ),
                                  Text(
                                    '${b.amount.toStringAsFixed(2)} JOD',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            )),
                      ] else ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isAr ? 'السعر الأساسي' : 'Base Price',
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                            Text(
                              '${service.basePrice.toStringAsFixed(2)} JOD',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],

                      // Guaranteed 0.00 JOD Delivery Fee
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isAr ? 'رسوم التوصيل' : 'Delivery Fee',
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                            Text(
                              isAr ? '0.00 د.أ (مجاناً)' : '0.00 JOD (Free)',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 20),

                      // Total Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isAr ? 'المجموع الإجمالي' : 'Total Amount',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            '${totalAmount.toStringAsFixed(2)} JOD',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 5. Booking / Checkout Action Button
                CustomButton(
                  label: isAr ? 'متابعة الطلب والدفع' : 'Proceed to Checkout',
                  onPressed: () {
                    final isValid = dynamicNotifier.validateForm(isAr);
                    if (!isValid) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            isAr
                              ? 'يرجى تعبئة كافة الحقول الإلزامية المطلوبة أولاً.'
                              : 'Please fill all required fields before proceeding.',
                          ),
                          backgroundColor: AppColors.error,
                        ),
                      );
                      return;
                    }

                    // Create Cart Item with complete immutable snapshot
                    final cartItem = CartItemEntity(
                      id: 'CART-DYN-${service.id}-${DateTime.now().millisecondsSinceEpoch}',
                      serviceId: service.id,
                      serviceNameAr: service.nameAr,
                      serviceNameEn: service.nameEn,
                      serviceType: service.type,
                      unitPrice: totalAmount,
                      quantity: 1,
                      unitAr: service.unitAr,
                      unitEn: service.unitEn,
                      imageUrl: service.imageUrl,
                      configurationSnapshot: dynamicState.answers,
                      priceBreakdown: quote?.breakdown.map((b) => b.toJson()).toList(),
                      serviceVersion: quote?.serviceVersion ?? config.currentVersion,
                    );

                    ref.read(cartControllerProvider.notifier).addItem(cartItem);
                    context.push(RoutePaths.checkout);
                  },
                ),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }
}

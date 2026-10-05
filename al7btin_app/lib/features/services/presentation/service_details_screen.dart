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
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../../core/widgets/loading_view.dart';
import '../../checkout/presentation/controllers/cart_controller.dart';
import '../../providers/domain/entities/provider_entity.dart';
import '../../providers/presentation/controllers/providers_controller.dart';
import '../domain/entities/service_entity.dart';
import 'controllers/services_controller.dart';
import 'controllers/dynamic_service_controller.dart';
import 'screens/dynamic_service_screen.dart';

/// Full production Service Details Screen tailored for Product Delivery vs Home Services
/// with full dynamic variant and option selection support.
class ServiceDetailsScreen extends ConsumerStatefulWidget {
  final String serviceId;

  const ServiceDetailsScreen({
    super.key,
    required this.serviceId,
  });

  @override
  ConsumerState<ServiceDetailsScreen> createState() => _ServiceDetailsScreenState();
}

class _ServiceDetailsScreenState extends ConsumerState<ServiceDetailsScreen> {
  int _quantity = 1;
  ServiceOptionEntity? _selectedOption;
  ProviderEntity? _selectedProvider;
  bool _withInstallation = false;
  final TextEditingController _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _incrementQuantity() {
    setState(() => _quantity++);
  }

  void _decrementQuantity() {
    if (_quantity > 1) {
      setState(() => _quantity--);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final dynamicState = ref.watch(dynamicServiceProvider(widget.serviceId));

    // If dynamic configuration has fields configured, render the generic metadata form
    if (dynamicState.configAsync.valueOrNull?.fields.isNotEmpty == true) {
      return DynamicServiceScreen(serviceId: widget.serviceId);
    }

    final serviceAsync = ref.watch(serviceDetailsProvider(widget.serviceId));
    final providersAsync = ref.watch(providersForServiceProvider(widget.serviceId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'تفاصيل الخدمة' : 'Service Details',
        showBackButton: true,
      ),
      body: serviceAsync.when(
        loading: () => LoadingView(
          message: isAr ? 'جاري تحميل تفاصيل الخدمة...' : 'Loading service details...',
        ),
        error: (error, stack) => ErrorView(
          message: isAr ? 'تعذر تحميل تفاصيل الخدمة. يرجى المحاولة مرة أخرى.' : 'Failed to load service details.',
          onRetry: () => ref.refresh(serviceDetailsProvider(widget.serviceId)),
        ),
        data: (service) {
          if (service == null) {
            return EmptyView(
              title: isAr ? 'الخدمة غير متوفرة' : 'Service Not Found',
              message: isAr
                  ? 'لم يتم العثور على الخدمة المطلوبة أو تم إيقافها مؤقتاً.'
                  : 'The requested service was not found or is currently inactive.',
              actionLabel: isAr ? 'العودة للرئيسية' : 'Back to Home',
              onAction: () => context.go(RoutePaths.home),
            );
          }

          final isHomeService = service.isHomeService;
          final activeOptions = service.options.where((o) => o.isActive).toList();

          // Select current option or default to first available
          final currentOption = _selectedOption ??
              (activeOptions.isNotEmpty
                  ? activeOptions.firstWhere((o) => o.isAvailable, orElse: () => activeOptions.first)
                  : null);

          final supportsInstallation = service.supportsInstallation || (currentOption?.supportsInstallation == true);
          final productBasePrice = currentOption?.productOnlyPrice ?? currentOption?.price ?? service.productOnlyPrice ?? service.basePrice;
          final installationFee = currentOption?.installationPrice ?? service.installationPrice ?? 0.0;
          final currentPrice = (supportsInstallation && _withInstallation)
              ? (productBasePrice + installationFee)
              : (currentOption?.price ?? service.basePrice);

          final currentUnitAr = currentOption?.unitAr ?? service.unitAr;
          final currentUnitEn = currentOption?.unitEn ?? service.unitEn;
          final totalEstimated = currentPrice * _quantity;

          return SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Service Visual Banner (White & Gold Luxury)
                        Container(
                          width: double.infinity,
                          height: 180,
                          decoration: BoxDecoration(
                            gradient: AppColors.goldShimmerOverlay,
                            color: AppColors.surface,
                            borderRadius: AppDimensions.borderRadiusLg,
                            border: Border.all(color: AppColors.borderGold),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Stack(
                            children: [
                              Center(
                                child: Icon(
                                  isHomeService ? Icons.home_repair_service_rounded : Icons.local_shipping_rounded,
                                  size: 72,
                                  color: AppColors.goldDark,
                                ),
                              ),
                              Positioned(
                                top: 12,
                                right: isAr ? 12 : null,
                                left: isAr ? null : 12,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: AppDimensions.borderRadiusSm,
                                    border: Border.all(color: AppColors.goldPrimary),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    isHomeService
                                        ? (isAr ? 'خدمة منزلية / فني' : 'Home Service')
                                        : (isAr ? 'منتج وتوصيل فوري' : 'Express Delivery'),
                                    style: const TextStyle(
                                      color: AppColors.goldDark,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ),
                              ),
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
                              borderRadius: AppDimensions.borderRadiusMd,
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

                        // Title & Pricing Row
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isAr ? service.nameAr : service.nameEn,
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.textPrimary,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    isHomeService
                                        ? (isAr ? 'معاينة فنية وتحديد تكلفة دقيقة' : 'Technical Inspection & Quotation')
                                        : (isAr ? 'توصيل معتمد ومضمون' : 'Verified Fast Delivery'),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.goldDark,
                                      fontWeight: FontWeight.w600,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.goldLight.withValues(alpha: 0.25),
                                borderRadius: AppDimensions.borderRadiusMd,
                                border: Border.all(color: AppColors.goldPrimary, width: 1),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '${currentPrice.toStringAsFixed(2)} JOD',
                                    style: const TextStyle(
                                      color: AppColors.goldDark,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                  Text(
                                    isAr ? 'لكل $currentUnitAr' : 'per $currentUnitEn',
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11,
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Service Description Card
                        GoldGradientCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isAr ? 'عن الخدمة والمواصفات' : 'Service Details',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                isAr ? service.descriptionAr : service.descriptionEn,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  height: 1.6,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Product + Installation Option Selector (e.g. Water Heaters, Pumps, Tanks, Locks)
                        if (supportsInstallation) ...[
                          GoldGradientCard(
                            hasGoldBorder: true,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.build_circle_outlined, color: AppColors.goldDark, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      isAr ? 'خيار التركيب والتثبيت' : 'Installation Option',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        fontFamily: 'Cairo',
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () => setState(() => _withInstallation = false),
                                        borderRadius: BorderRadius.circular(10),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                                          decoration: BoxDecoration(
                                            color: !_withInstallation
                                                ? AppColors.goldPrimary.withValues(alpha: 0.15)
                                                : AppColors.surface,
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: !_withInstallation ? AppColors.goldPrimary : AppColors.border,
                                              width: !_withInstallation ? 1.5 : 1.0,
                                            ),
                                          ),
                                          child: Column(
                                            children: [
                                              Text(
                                                isAr ? 'المنتج فقط' : 'Product Only',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 13,
                                                  color: !_withInstallation ? AppColors.goldDark : AppColors.textPrimary,
                                                  fontFamily: 'Cairo',
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${productBasePrice.toStringAsFixed(2)} JOD',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.textSecondary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () => setState(() => _withInstallation = true),
                                        borderRadius: BorderRadius.circular(10),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                                          decoration: BoxDecoration(
                                            color: _withInstallation
                                                ? AppColors.goldPrimary.withValues(alpha: 0.15)
                                                : AppColors.surface,
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: _withInstallation ? AppColors.goldPrimary : AppColors.border,
                                              width: _withInstallation ? 1.5 : 1.0,
                                            ),
                                          ),
                                          child: Column(
                                            children: [
                                              Text(
                                                isAr ? 'مع التركيب المعتمد' : 'With Installation',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 13,
                                                  color: _withInstallation ? AppColors.goldDark : AppColors.textPrimary,
                                                  fontFamily: 'Cairo',
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '+${installationFee.toStringAsFixed(2)} JOD',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.goldDark,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Dynamic Options / Variants Selection (e.g. Cups, 19L Gallons, Refill, Sizes)
                        if (activeOptions.isNotEmpty) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                isAr ? 'الخيارات والأحجام المتوفرة' : 'Available Options & Sizes',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              Text(
                                isAr ? '${activeOptions.length} خيارات' : '${activeOptions.length} options',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.goldDark,
                                  fontWeight: FontWeight.w700,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: activeOptions.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final option = activeOptions[index];
                              final isSelected = currentOption?.id == option.id;
                              final isAvailable = option.isAvailable;

                              return InkWell(
                                onTap: isAvailable
                                    ? () {
                                        setState(() {
                                          _selectedOption = option;
                                        });
                                      }
                                    : null,
                                borderRadius: AppDimensions.borderRadiusMd,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.goldPrimary.withValues(alpha: 0.12)
                                        : (isAvailable ? AppColors.surface : AppColors.backgroundSecondary),
                                    borderRadius: AppDimensions.borderRadiusMd,
                                    border: Border.all(
                                      color: isSelected
                                          ? AppColors.goldPrimary
                                          : (isAvailable ? AppColors.border : AppColors.border.withValues(alpha: 0.5)),
                                      width: isSelected ? 1.5 : 1.0,
                                    ),
                                    boxShadow: isSelected
                                        ? [
                                            BoxShadow(
                                              color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 22,
                                        height: 22,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: isSelected ? AppColors.goldDark : Colors.transparent,
                                          border: Border.all(
                                            color: isSelected ? AppColors.goldDark : AppColors.border,
                                            width: 2,
                                          ),
                                        ),
                                        child: isSelected
                                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                                            : null,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Flexible(
                                                  child: Text(
                                                    isAr ? option.nameAr : option.nameEn,
                                                    style: TextStyle(
                                                      fontSize: 14,
                                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                                                      color: isAvailable ? AppColors.textPrimary : AppColors.textMuted,
                                                      fontFamily: 'Cairo',
                                                    ),
                                                  ),
                                                ),
                                                if (option.size != null && option.size!.isNotEmpty) ...[
                                                  const SizedBox(width: 8),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: AppColors.goldLight.withValues(alpha: 0.3),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Text(
                                                      option.size!,
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
                                            const SizedBox(height: 2),
                                            Text(
                                              isAvailable
                                                  ? (isAr ? 'الوحدة: ${option.unitAr}' : 'Unit: ${option.unitEn}')
                                                  : (isAr ? 'غير متوفر حالياً' : 'Currently Unavailable'),
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: isAvailable ? AppColors.textSecondary : AppColors.error,
                                                fontFamily: 'Cairo',
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '${option.price.toStringAsFixed(2)} JOD',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w900,
                                          color: isAvailable ? AppColors.goldDark : AppColors.textMuted,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Available Providers for this Service (Customer Discovery)
                        providersAsync.when(
                          data: (providers) {
                            if (providers.isEmpty) return const SizedBox.shrink();
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      isAr ? 'المزودون المتاحون للطلب الفوري' : 'Available Providers',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                    Text(
                                      isAr ? '${providers.length} مزودين' : '${providers.length} providers',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.goldDark,
                                        fontWeight: FontWeight.w700,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: providers.length,
                                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                                  itemBuilder: (context, index) {
                                    final prov = providers[index];
                                    final isSelected = _selectedProvider?.id == prov.id;
                                    return InkWell(
                                      onTap: () {
                                        setState(() {
                                          if (isSelected) {
                                            _selectedProvider = null;
                                          } else {
                                            _selectedProvider = prov;
                                          }
                                        });
                                      },
                                      borderRadius: AppDimensions.borderRadiusMd,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? AppColors.goldPrimary.withValues(alpha: 0.12)
                                              : AppColors.surface,
                                          borderRadius: AppDimensions.borderRadiusMd,
                                          border: Border.all(
                                            color: isSelected ? AppColors.goldPrimary : AppColors.border,
                                            width: isSelected ? 1.5 : 1.0,
                                          ),
                                          boxShadow: isSelected
                                              ? [
                                                  BoxShadow(
                                                    color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                                    blurRadius: 8,
                                                    offset: const Offset(0, 2),
                                                  ),
                                                ]
                                              : null,
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 22,
                                              height: 22,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: isSelected ? AppColors.goldDark : Colors.transparent,
                                                border: Border.all(
                                                  color: isSelected ? AppColors.goldDark : AppColors.border,
                                                  width: 2,
                                                ),
                                              ),
                                              child: isSelected
                                                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                                                  : null,
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Flexible(
                                                        child: Text(
                                                          isAr ? prov.nameAr : prov.nameEn,
                                                          style: TextStyle(
                                                            fontSize: 13,
                                                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                                                            color: AppColors.textPrimary,
                                                            fontFamily: 'Cairo',
                                                          ),
                                                        ),
                                                      ),
                                                      const SizedBox(width: 6),
                                                      const Icon(Icons.star_rounded, color: AppColors.goldDark, size: 14),
                                                      Text(
                                                        prov.rating.toStringAsFixed(1),
                                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.goldDark),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    '📍 ${prov.address}',
                                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Cairo'),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            TextButton(
                                              style: TextButton.styleFrom(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                minimumSize: Size.zero,
                                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              ),
                                              onPressed: () => context.push(RoutePaths.providerDetailsPath(prov.id)),
                                              child: Text(
                                                isAr ? 'عرض المتجر' : 'Store Page',
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.goldDark, fontFamily: 'Cairo'),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(height: 16),
                              ],
                            );
                          },
                          loading: () => const SizedBox.shrink(),
                          error: (_, __) => const SizedBox.shrink(),
                        ),

                        // Dynamic Workflow: Product Quantity Selector vs Home Service Details
                        if (!isHomeService) ...[
                          GoldGradientCard(
                            hasGoldBorder: true,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isAr ? 'الكمية المطلوبة' : 'Select Quantity',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isAr ? 'الوحدة: $currentUnitAr' : 'Unit: $currentUnitEn',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.goldDark,
                                        fontWeight: FontWeight.w600,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  decoration: BoxDecoration(
                                    color: AppColors.backgroundSecondary,
                                    borderRadius: AppDimensions.borderRadiusMd,
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove_rounded, color: AppColors.textPrimary, size: 20),
                                        onPressed: _decrementQuantity,
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                        child: Text(
                                          '$_quantity',
                                          style: const TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.w900,
                                            color: AppColors.goldDark,
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add_rounded, color: AppColors.textPrimary, size: 20),
                                        onPressed: _incrementQuantity,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ] else ...[
                          GoldGradientCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.verified_user_outlined, color: AppColors.goldDark, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      isAr ? 'ضمان بتنحل للخدمات المنزلية' : 'btin7al Guarantee',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  isAr
                                      ? '• يتم إرسال فنيين معتمدين ومفحوصين أمنياً ومهنياً.\n• السعر يمثل رسوم الكشف والمعاينة المبدئية.\n• تسعير القطع والصيانة يتم بعد المعاينة بموافقتك المسبقة.'
                                      : '• Certified and verified professional technicians.\n• Price represents the initial diagnostic fee.\n• Parts and labor are quoted after inspection.',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                    height: 1.6,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),

                        // Special Instructions / Notes Field
                        Text(
                          isAr ? 'ملاحظات أو متطلبات خاصة (اختياري)' : 'Special Instructions (Optional)',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _notesController,
                          maxLines: 2,
                          decoration: InputDecoration(
                            hintText: isAr
                                ? 'مثال: مطلوب تفريغ سريع، التوصيل للطابق الرابع'
                                : 'e.g. deliver to 4th floor, fast delivery needed',
                          ),
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),

                // Bottom Checkout Action Bar
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
                        blurRadius: 12,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      if (!isHomeService) ...[
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              isAr ? 'الإجمالي المبدئي' : 'Subtotal',
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontFamily: 'Cairo'),
                            ),
                            Text(
                              '${totalEstimated.toStringAsFixed(2)} JOD',
                              style: const TextStyle(
                                color: AppColors.goldDark,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                      ],
                      Expanded(
                        child: CustomButton(
                          label: isHomeService
                              ? (isAr ? 'طلب معاينة وعرض سعر فني' : 'Request Inspection & Quotation')
                              : (isAr ? 'إتمام الطلب ($_quantity $currentUnitAr)' : 'Order Now ($_quantity $currentUnitEn)'),
                          icon: isHomeService ? Icons.engineering_rounded : Icons.shopping_cart_checkout_rounded,
                          onPressed: () {
                            // Add item to Cart with exact unit price and selected variant & provider
                            ref.read(cartControllerProvider.notifier).addToCart(
                              service,
                              providerId: _selectedProvider?.id,
                              providerNameAr: _selectedProvider?.nameAr,
                              providerNameEn: _selectedProvider?.nameEn,
                              selectedOption: currentOption,
                              quantity: _quantity,
                              notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
                            );

                            // Navigate to Checkout
                            context.push(RoutePaths.checkout);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


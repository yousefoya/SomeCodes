import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/routing/route_paths.dart';
import '../../../../core/widgets/custom_app_bar.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../checkout/presentation/controllers/cart_controller.dart';
import '../../../services/domain/entities/service_entity.dart';
import '../../domain/entities/provider_entity.dart';
import '../controllers/providers_controller.dart';

/// Customer-Facing Provider Details Screen
/// Displays provider branding, live availability status, GPS location, operating hours,
/// and list of assigned & available services with dynamic variant options and direct ordering.
class ProviderDetailsScreen extends ConsumerStatefulWidget {
  final String providerId;

  const ProviderDetailsScreen({
    super.key,
    required this.providerId,
  });

  @override
  ConsumerState<ProviderDetailsScreen> createState() => _ProviderDetailsScreenState();
}

class _ProviderDetailsScreenState extends ConsumerState<ProviderDetailsScreen> {
  void _showMapDialog(BuildContext context, ProviderEntity provider, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.location_on_rounded, color: AppColors.goldDark, size: 24),
            const SizedBox(width: 8),
            Text(
              isAr ? 'موقع المزود على الخريطة' : 'Provider Map Location',
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              provider.nameAr,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, fontFamily: 'Cairo'),
            ),
            const SizedBox(height: 6),
            Text(
              provider.address,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Cairo'),
            ),
            const SizedBox(height: 12),
            Container(
              height: 140,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.goldPrimary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.goldPrimary.withValues(alpha: 0.4),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 24),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'GPS: ${provider.latitude.toStringAsFixed(4)}, ${provider.longitude.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
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
            child: Text(isAr ? 'إغلاق' : 'Close', style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }

  void _addServiceToCart(BuildContext context, ServiceEntity service, ProviderEntity provider, ServiceOptionEntity? option, bool isAr) {
    ref.read(cartControllerProvider.notifier).addToCart(
      service,
      providerId: provider.id,
      providerNameAr: provider.nameAr,
      providerNameEn: provider.nameEn,
      selectedOption: option,
      quantity: 1,
    );

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isAr
                    ? 'تمت إضافة ${service.nameAr} (${provider.nameAr}) إلى السلة'
                    : 'Added ${service.nameEn} to Cart',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: isAr ? 'السلة' : 'Cart',
          textColor: Colors.white,
          onPressed: () => context.push(RoutePaths.checkout),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final providerAsync = ref.watch(providerDetailsProvider(widget.providerId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'تفاصيل المزود' : 'Provider Details',
        showBackButton: true,
      ),
      body: providerAsync.when(
        loading: () => LoadingView(
          message: isAr ? 'جاري تحميل بيانات المزود...' : 'Loading provider details...',
        ),
        error: (err, st) => ErrorView(
          message: isAr ? 'تعذر تحميل بيانات المزود، يرجى المحاولة مرة أخرى.' : 'Failed to load provider details.',
          onRetry: () => ref.refresh(providerDetailsProvider(widget.providerId)),
        ),
        data: (provider) {
          if (provider == null) {
            return EmptyView(
              title: isAr ? 'المزود غير موجود' : 'Provider Not Found',
              message: isAr ? 'لم يتم العثور على هذا المزود أو تم إيقافه.' : 'Provider was not found or is currently inactive.',
              actionLabel: isAr ? 'العودة للرئيسية' : 'Back to Home',
              onAction: () => context.go(RoutePaths.home),
            );
          }

          final isOnline = provider.isActive && provider.isAvailable;
          final availableServices = provider.services.where((s) => provider.isServiceAvailable(s.id)).toList();

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppDimensions.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Provider Hero Banner & Brand Card
                  _buildProviderHeaderCard(provider, isOnline, isAr),
                  const SizedBox(height: 16),

                  // 2. Location & Working Hours Card
                  _buildLocationAndHoursCard(context, provider, isAr),
                  const SizedBox(height: 16),

                  // 3. About / Description Card
                  if (provider.description.isNotEmpty) ...[
                    _buildAboutCard(provider, isAr),
                    const SizedBox(height: 16),
                  ],

                  // 4. Assigned & Available Services List
                  _buildServicesSection(context, provider, availableServices, isOnline, isAr),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProviderHeaderCard(ProviderEntity provider, bool isOnline, bool isAr) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Store Avatar / Icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              gradient: AppColors.goldGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: AppColors.goldPrimary.withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 34),
          ),
          const SizedBox(width: 14),

          // Store Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        provider.nameAr,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo',
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const Icon(Icons.verified_rounded, color: AppColors.goldDark, size: 18),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  provider.nameEn,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),

                // Rating & Availability Badges
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    // Rating
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.goldPrimary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded, color: AppColors.goldDark, size: 15),
                          const SizedBox(width: 4),
                          Text(
                            provider.rating.toStringAsFixed(1),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppColors.goldDark,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Status Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isOnline
                            ? AppColors.success.withValues(alpha: 0.12)
                            : AppColors.error.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isOnline ? AppColors.success : AppColors.error,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            isOnline
                                ? (isAr ? 'متوفر الآن' : 'Available')
                                : (isAr ? 'غير متاح حالياً' : 'Offline'),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Cairo',
                              color: isOnline ? AppColors.success : AppColors.error,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationAndHoursCard(BuildContext context, ProviderEntity provider, bool isAr) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Address Row
          Row(
            children: [
              const Icon(Icons.location_on_outlined, color: AppColors.goldDark, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isAr ? 'العنوان ومنطقة التغطية' : 'Address & Coverage',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontFamily: 'Cairo'),
                    ),
                    Text(
                      provider.address,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  side: const BorderSide(color: AppColors.goldPrimary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.map_outlined, size: 14, color: AppColors.goldDark),
                label: Text(
                  isAr ? 'الخريطة' : 'Map',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.goldDark),
                ),
                onPressed: () => _showMapDialog(context, provider, isAr),
              ),
            ],
          ),
          const Divider(height: 20, color: AppColors.border),

          // Working Hours & Phone
          Row(
            children: [
              const Icon(Icons.access_time_rounded, color: AppColors.goldDark, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isAr ? 'أوقات العمل' : 'Operating Hours',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontFamily: 'Cairo'),
                    ),
                    Text(
                      provider.operatingHours,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.phone_outlined, color: AppColors.textSecondary, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    provider.phoneNumber,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAboutCard(ProviderEntity provider, bool isAr) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isAr ? 'عن المزود' : 'About Provider',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(
            provider.description,
            style: const TextStyle(fontSize: 13, height: 1.5, color: AppColors.textSecondary, fontFamily: 'Cairo'),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesSection(
    BuildContext context,
    ProviderEntity provider,
    List<ServiceEntity> availableServices,
    bool isOnline,
    bool isAr,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isAr ? 'الخدمات والمنتجات المتوفرة' : 'Available Services & Products',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'Cairo', color: AppColors.textPrimary),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.goldPrimary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${availableServices.length} ${isAr ? 'خدمات' : 'services'}',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.goldDark, fontFamily: 'Cairo'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (availableServices.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Center(
              child: Column(
                children: [
                  const Icon(Icons.inventory_2_outlined, size: 40, color: AppColors.textMuted),
                  const SizedBox(height: 8),
                  Text(
                    isAr ? 'لا توجد خدمات متاحة للطلب حالياً لدى هذا المزود.' : 'No services currently available for ordering from this provider.',
                    style: const TextStyle(fontFamily: 'Cairo', color: AppColors.textSecondary, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: availableServices.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final service = availableServices[index];
              return _buildServiceCard(context, provider, service, isOnline, isAr);
            },
          ),
      ],
    );
  }

  Widget _buildServiceCard(
    BuildContext context,
    ProviderEntity provider,
    ServiceEntity service,
    bool isOnline,
    bool isAr,
  ) {
    final hasOptions = service.options.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon Container
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(Icons.bolt_rounded, color: AppColors.goldDark, size: 26),
              ),
              const SizedBox(width: 12),

              // Title and Description
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.nameAr,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'Cairo',
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      service.descriptionAr,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontFamily: 'Cairo',
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Price
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${service.basePrice.toStringAsFixed(2)} JOD',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: AppColors.goldDark,
                    ),
                  ),
                  Text(
                    isAr ? 'لكل ${service.unitAr}' : 'per ${service.unitEn}',
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontFamily: 'Cairo'),
                  ),
                ],
              ),
            ],
          ),

          // Options Chips if present
          if (hasOptions) ...[
            const SizedBox(height: 10),
            const Divider(height: 1, color: AppColors.borderLight),
            const SizedBox(height: 10),
            Text(
              isAr ? 'الخيارات والمقاسات المتوفرة:' : 'Available Options & Sizes:',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.textSecondary),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: service.options.map((opt) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    '${opt.nameAr} - ${opt.price.toStringAsFixed(2)} JOD',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, fontFamily: 'Cairo', color: AppColors.textPrimary),
                  ),
                );
              }).toList(),
            ),
          ],

          const SizedBox(height: 12),

          // Action Button Row
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    side: const BorderSide(color: AppColors.goldPrimary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => context.push(RoutePaths.serviceDetailsPath(service.id)),
                  child: Text(
                    isAr ? 'عرض التفاصيل الكاملة' : 'Full Details',
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.goldDark),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isOnline ? AppColors.goldPrimary : AppColors.textMuted,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 16),
                  label: Text(
                    isAr ? 'اطلب الآن' : 'Order Now',
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 12),
                  ),
                  onPressed: isOnline
                      ? () => _addServiceToCart(context, service, provider, service.options.isNotEmpty ? service.options.first : null, isAr)
                      : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_app_bar.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../../core/widgets/loading_view.dart';
import 'controllers/categories_controller.dart';

/// Categories Screen rendering dynamic categories from CategoryRepository
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  IconData _getIconForName(String? iconName) {
    switch (iconName) {
      case 'local_shipping_rounded':
        return Icons.local_shipping_rounded;
      case 'home_repair_service_rounded':
        return Icons.home_repair_service_rounded;
      case 'local_offer_rounded':
        return Icons.local_offer_rounded;
      default:
        return Icons.grid_view_rounded;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'الأقسام الرئيسية' : 'Categories',
        showBackButton: false,
      ),
      body: SafeArea(
        child: categoriesAsync.when(
          loading: () => LoadingView(
            message: isAr ? 'جاري تحميل الأقسام...' : 'Loading categories...',
          ),
          error: (err, stack) => ErrorView(
            message: isAr ? 'تعذر تحميل الأقسام، يرجى المحاولة مرة أخرى.' : 'Failed to load categories.',
            onRetry: () => ref.refresh(categoriesProvider),
          ),
          data: (categories) {
            if (categories.isEmpty) {
              return EmptyView(
                title: isAr ? 'لا توجد أقسام حالياً' : 'No Categories Available',
                message: isAr
                    ? 'سيتم إضافة الأقسام والخدمات قريباً من لوحة الإدارة.'
                    : 'Categories will be added soon from the Admin Dashboard.',
                actionLabel: isAr ? 'تحديث' : 'Refresh',
                onAction: () => ref.refresh(categoriesProvider),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(AppDimensions.md),
              itemCount: categories.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final cat = categories[index];
                return GoldGradientCard(
                  hasGoldBorder: true,
                  onTap: () {
                    ref.read(selectedCategoryIdProvider.notifier).state = cat.id;
                    context.go(RoutePaths.home);
                  },
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AppColors.backgroundSecondary,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.goldPrimary, width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.goldPrimary.withValues(alpha: 0.15),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Icon(
                          _getIconForName(cat.iconName),
                          color: AppColors.goldDark,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  cat.nameAr,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                                Text(
                                  cat.nameEn,
                                  style: const TextStyle(
                                    color: AppColors.goldDark,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                            if (cat.descriptionAr != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                isAr ? cat.descriptionAr! : (cat.descriptionEn ?? cat.descriptionAr!),
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                  fontFamily: 'Cairo',
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.goldDark, size: 14),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/localization/app_locale_provider.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/widgets/custom_search_field.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/gold_gradient_card.dart';
import '../../../core/widgets/loading_view.dart';
import '../../address/presentation/controllers/address_controller.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import '../../categories/domain/entities/category_entity.dart';
import '../../categories/presentation/controllers/categories_controller.dart';
import '../../coupons/domain/entities/coupon_entity.dart';
import '../../coupons/presentation/controllers/coupons_controller.dart';
import '../../services/domain/entities/service_entity.dart';
import '../../services/presentation/controllers/services_controller.dart';

/// Modern Customer Home Screen with Header, Search, Categories, Dynamic Services Grid, and Offers Banner
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  IconData _getCategoryIcon(String? iconName) {
    switch (iconName) {
      case 'local_shipping_rounded':
        return Icons.local_shipping_rounded;
      case 'home_repair_service_rounded':
        return Icons.home_repair_service_rounded;
      case 'local_offer_rounded':
        return Icons.local_offer_rounded;
      case 'plumbing_rounded':
        return Icons.plumbing_rounded;
      case 'bolt_rounded':
        return Icons.bolt_rounded;
      default:
        return Icons.grid_view_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentLocale = ref.watch(appLocaleProvider);
    final isAr = currentLocale.languageCode == 'ar';

    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final userName = user?.name ?? (isAr ? 'ضيف بتنحل' : 'Guest User');

    final selectedAddress = ref.watch(selectedDeliveryAddressProvider);
    final selectedCategoryId = ref.watch(selectedCategoryIdProvider);
    final searchQuery = ref.watch(serviceSearchQueryProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final servicesAsync = searchQuery.trim().isNotEmpty
        ? ref.watch(searchServicesProvider)
        : ref.watch(servicesProvider(selectedCategoryId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.goldPrimary,
          backgroundColor: AppColors.surface,
          onRefresh: () async {
            ref.invalidate(categoriesProvider);
            ref.invalidate(servicesProvider(selectedCategoryId));
            ref.invalidate(searchServicesProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Modern Header
                _buildHeader(
                  context,
                  userName: userName,
                  selectedAddress: selectedAddress?.area ?? (isAr ? 'عمان، الأردن' : 'Amman, Jordan'),
                  isAr: isAr,
                ),
                const SizedBox(height: 16),

                // 2. Search Field
                CustomSearchField(
                  controller: _searchController,
                  hintText: isAr ? 'ابحث عن خدمة أو منتج (غاز، سباكة، كهرباء، صيانة...)' : 'Search services or products...',
                  onChanged: (val) {
                    ref.read(serviceSearchQueryProvider.notifier).state = val;
                  },
                  onClear: () {
                    ref.read(serviceSearchQueryProvider.notifier).state = '';
                  },
                ),
                const SizedBox(height: 18),

                // 3. Offers & Promotional Banner
                _buildOffersBanner(isAr),
                const SizedBox(height: 22),

                // 4. Dynamic Categories Section (Horizontal Selector)
                _buildCategoriesSection(categoriesAsync, selectedCategoryId, isAr),
                const SizedBox(height: 22),

                // 5. Dynamic Services Section (Grid of Services & Products)
                _buildServicesSection(servicesAsync, isAr),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context, {
    required String userName,
    required String selectedAddress,
    required bool isAr,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            GestureDetector(
              onTap: () => context.go(RoutePaths.profile),
              child: Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.goldGradient,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.goldPrimary.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(Icons.person, color: Colors.white, size: 24),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.location_on_rounded, size: 14, color: AppColors.goldDark),
                    const SizedBox(width: 4),
                    Text(
                      selectedAddress,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ],
                ),
                Text(
                  userName,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ],
        ),
        Row(
          children: [
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(Icons.language_rounded, color: AppColors.goldDark, size: 20),
              ),
              tooltip: isAr ? 'English' : 'العربية',
              onPressed: () {
                ref.read(appLocaleProvider.notifier).toggleLocale();
              },
            ),
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(Icons.shopping_bag_outlined, color: AppColors.goldDark, size: 20),
              ),
              tooltip: isAr ? 'السلة' : 'Cart',
              onPressed: () => context.push(RoutePaths.checkout),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildOffersBanner(bool isAr) {
    final coupons = ref.watch(couponsControllerProvider);
    final activeCoupon = coupons.isNotEmpty && coupons.any((c) => c.isActive)
        ? coupons.firstWhere((c) => c.isActive)
        : null;

    final String title;
    final String subtitle;

    if (activeCoupon != null) {
      final valStr = activeCoupon.type == CouponType.percentage
          ? '${activeCoupon.value.toInt()}%'
          : '${activeCoupon.value.toStringAsFixed(1)} JOD';
      title = isAr ? 'خصم $valStr على طلبك القادم' : '$valStr Off Your Next Order';
      subtitle = isAr
          ? 'استخدم كود: ${activeCoupon.code} عند إتمام الطلب'
          : 'Use code: ${activeCoupon.code} at checkout';
    } else {
      title = isAr ? 'خدمات التوصيل والصيانة الفورية' : 'Express Delivery & Home Services';
      subtitle = isAr
          ? 'اطلب الغاز، السباكة، والكهرباء بكل موثوقية وسرعة'
          : 'Order gas, plumbing, electrical & maintenance effortlessly';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppColors.goldGradient,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: AppColors.goldPrimary.withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    activeCoupon != null
                        ? (isAr ? 'عرض حصري 🌟' : 'SPECIAL OFFER 🌟')
                        : (isAr ? 'بتنحل الأردن 🇯🇴' : 'btin7al Jordan 🇯🇴'),
                    style: const TextStyle(
                      color: AppColors.goldDark,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo',
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              activeCoupon != null ? Icons.local_offer_rounded : Icons.verified_rounded,
              color: Colors.white,
              size: 34,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoriesSection(
    AsyncValue<List<CategoryEntity>> categoriesAsync,
    String? selectedCategoryId,
    bool isAr,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isAr ? 'الأقسام والخدمات' : 'Categories',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w900,
                fontFamily: 'Cairo',
              ),
            ),
            TextButton(
              onPressed: () => context.go(RoutePaths.categories),
              child: Text(
                isAr ? 'عرض الكل' : 'View All',
                style: const TextStyle(
                  color: AppColors.goldDark,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Cairo',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        categoriesAsync.when(
          loading: () => const SizedBox(
            height: 44,
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.goldPrimary),
              ),
            ),
          ),
          error: (_, __) => Text(
            isAr ? 'تعذر تحميل الأقسام' : 'Failed to load categories',
            style: const TextStyle(color: AppColors.error, fontSize: 12),
          ),
          data: (categories) {
            return SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _buildCategoryChip(
                      id: null,
                      label: isAr ? 'الكل' : 'All',
                      icon: Icons.all_inclusive_rounded,
                      isSelected: selectedCategoryId == null,
                      onTap: () {
                        ref.read(selectedCategoryIdProvider.notifier).state = null;
                      },
                    ),
                  ),
                  ...categories.map((cat) {
                    final isSelected = selectedCategoryId == cat.id;
                    return Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: _buildCategoryChip(
                        id: cat.id,
                        label: isAr ? cat.nameAr : cat.nameEn,
                        icon: _getCategoryIcon(cat.iconName),
                        isSelected: isSelected,
                        onTap: () {
                          ref.read(selectedCategoryIdProvider.notifier).state = cat.id;
                        },
                      ),
                    );
                  }),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildCategoryChip({
    required String? id,
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.goldPrimary : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.goldPrimary : AppColors.border,
            width: 1.2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.goldPrimary.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 6,
                  ),
                ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : AppColors.goldDark,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.textPrimary,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                fontSize: 13,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServicesSection(
    AsyncValue<List<ServiceEntity>> servicesAsync,
    bool isAr,
  ) {
    final searchQuery = ref.watch(serviceSearchQueryProvider);
    final isSearching = searchQuery.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isSearching
                  ? (isAr ? 'نتائج البحث عن "$searchQuery"' : 'Search results for "$searchQuery"')
                  : (isAr ? 'الخدمات المتاحة للطلب الفوري' : 'Available Services'),
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w900,
                fontFamily: 'Cairo',
              ),
            ),
            if (isSearching)
              GestureDetector(
                onTap: () {
                  _searchController.clear();
                  ref.read(serviceSearchQueryProvider.notifier).state = '';
                },
                child: Text(
                  isAr ? 'إلغاء البحث' : 'Clear',
                  style: const TextStyle(
                    color: AppColors.goldDark,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        servicesAsync.when(
          loading: () => LoadingView(
            message: isSearching
                ? (isAr ? 'جاري البحث في الخدمات...' : 'Searching services...')
                : (isAr ? 'جاري تحميل الخدمات...' : 'Loading services...'),
          ),
          error: (err, stack) => ErrorView(
            message: isAr
                ? 'تعذر تحميل الخدمات، يرجى المحاولة لاحقاً.'
                : 'Failed to load services. Please try again.',
            onRetry: () {
              if (isSearching) {
                ref.invalidate(searchServicesProvider);
              } else {
                ref.invalidate(servicesProvider(ref.read(selectedCategoryIdProvider)));
              }
            },
          ),
          data: (services) {
            if (services.isEmpty) {
              return EmptyView(
                title: isSearching
                    ? (isAr ? 'لا توجد نتائج بحث' : 'No Results Found')
                    : (isAr ? 'لا توجد خدمات متاحة' : 'No Services Available'),
                message: isSearching
                    ? (isAr ? 'لم نتمكن من العثور على خدمات تطابق "$searchQuery".' : 'No services match your search query.')
                    : (isAr ? 'لا تتوفر خدمات في هذا القسم حالياً.' : 'No services found in this section.'),
                actionLabel: isSearching
                    ? (isAr ? 'مسح البحث وعرض الكل' : 'Clear Search')
                    : (isAr ? 'عرض كل الخدمات' : 'Show All Services'),
                onAction: () {
                  if (isSearching) {
                    _searchController.clear();
                    ref.read(serviceSearchQueryProvider.notifier).state = '';
                  } else {
                    ref.read(selectedCategoryIdProvider.notifier).state = null;
                  }
                },
              );
            }

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: services.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                mainAxisExtent: 225,
              ),
              itemBuilder: (context, index) {
                final service = services[index];
                return _buildServiceCard(context, service: service, isAr: isAr);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildServiceCard(BuildContext context, {required ServiceEntity service, required bool isAr}) {
    final isHomeService = service.isHomeService;

    return GoldGradientCard(
      hasGoldBorder: false,
      onTap: () => context.push(RoutePaths.serviceDetailsPath(service.id)),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Service Thumbnail Container
          Container(
            width: double.infinity,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  isHomeService ? Icons.home_repair_service_rounded : Icons.local_shipping_rounded,
                  size: 40,
                  color: AppColors.goldDark,
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.goldPrimary),
                    ),
                    child: Text(
                      isHomeService ? (isAr ? 'فنيين' : 'Technician') : (isAr ? 'توصيل' : 'Delivery'),
                      style: const TextStyle(
                        color: AppColors.goldDark,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Service Title
          Text(
            isAr ? service.nameAr : service.nameEn,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w800,
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 3),

          // Description
          Expanded(
            child: Text(
              isAr ? service.descriptionAr : service.descriptionEn,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 10,
                fontFamily: 'Cairo',
                height: 1.3,
              ),
            ),
          ),
          const SizedBox(height: 6),

          // Price and Unit Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${service.basePrice.toStringAsFixed(1)} JOD',
                    style: const TextStyle(
                      color: AppColors.goldDark,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  Text(
                    '${isAr ? 'لكل' : 'per'} ${isAr ? service.unitAr : service.unitEn}',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 9,
                      fontFamily: 'Cairo',
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.goldGradient,
                ),
                child: const Icon(Icons.arrow_forward_rounded, size: 14, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

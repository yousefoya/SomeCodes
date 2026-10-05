import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/widgets/custom_app_bar.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/gold_gradient_card.dart';
import '../../../../core/widgets/loading_view.dart';
import '../controllers/address_controller.dart';
import 'add_edit_address_screen.dart';

/// Screen displaying user's saved addresses with management & selection capabilities
class SavedAddressesScreen extends ConsumerWidget {
  final bool isSelectionMode;

  const SavedAddressesScreen({
    super.key,
    this.isSelectionMode = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(appLocaleProvider);
    final isAr = currentLocale.languageCode == 'ar';

    final addressesAsync = ref.watch(addressNotifierProvider);
    final selectedAddress = ref.watch(selectedDeliveryAddressProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'عناويني المحفوظة' : 'Saved Addresses',
      ),
      body: SafeArea(
        child: addressesAsync.when(
          loading: () => LoadingView(
            message: isAr ? 'جاري تحميل العناوين...' : 'Loading addresses...',
          ),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.read(addressNotifierProvider.notifier).loadAddresses(),
          ),
          data: (addresses) {
            if (addresses.isEmpty) {
              return EmptyView(
                title: isAr ? 'لا توجد عناوين محفوظة' : 'No Saved Addresses',
                message: isAr
                    ? 'أضف عنوان توصيل لتسهيل وتسريع عملية الطلب'
                    : 'Add a delivery address for faster ordering',
                icon: Icons.location_off_rounded,
                actionLabel: isAr ? 'إضافة عنوان جديد' : 'Add New Address',
                onAction: () => _navigateToAddAddress(context),
              );
            }

            return Column(
              children: [
                if (isSelectionMode)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    color: AppColors.goldLight.withValues(alpha: 0.25),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, color: AppColors.goldDark, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            isAr
                                ? 'اختر عنوان التوصيل المناسب للطلب'
                                : 'Select delivery address for this order',
                            style: const TextStyle(
                              color: AppColors.goldDark,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    itemCount: addresses.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final address = addresses[index];
                      final isSelected = selectedAddress?.id == address.id;

                      return GoldGradientCard(
                        hasGoldBorder: isSelected,
                        onTap: () {
                          ref.read(selectedDeliveryAddressProvider.notifier).state = address;
                          if (isSelectionMode) {
                            context.pop(address);
                          }
                        },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.goldPrimary.withValues(alpha: 0.16)
                                        : AppColors.backgroundSecondary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _getAddressIcon(address.title),
                                    color: isSelected ? AppColors.goldDark : AppColors.textSecondary,
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            address.title,
                                            style: const TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.textPrimary,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                          if (address.isDefault) ...[
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(4),
                                                border: Border.all(color: AppColors.goldPrimary, width: 0.8),
                                              ),
                                              child: Text(
                                                isAr ? 'افتراضي' : 'Default',
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.goldDark,
                                                  fontFamily: 'Cairo',
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${address.city} - ${address.area}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.goldDark,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(
                                    Icons.check_circle_rounded,
                                    color: AppColors.goldDark,
                                    size: 22,
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              address.fullAddressText,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                height: 1.4,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            if (address.deliveryInstructions != null &&
                                address.deliveryInstructions!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.note_alt_outlined, size: 14, color: AppColors.textMuted),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      address.deliveryInstructions!,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppColors.textMuted,
                                        fontStyle: FontStyle.italic,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            const Divider(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (!address.isDefault)
                                  TextButton(
                                    onPressed: () {
                                      ref.read(addressNotifierProvider.notifier).setDefaultAddress(address.id);
                                    },
                                    style: TextButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      minimumSize: Size.zero,
                                    ),
                                    child: Text(
                                      isAr ? 'تعيين كافتراضي' : 'Set as Default',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 20),
                                  tooltip: isAr ? 'حذف' : 'Delete',
                                  onPressed: () => _confirmDelete(context, ref, address.id, isAr),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: CustomButton(
                    label: isAr ? 'إضافة عنوان جديد' : 'Add New Address',
                    icon: Icons.add_location_alt_outlined,
                    onPressed: () => _navigateToAddAddress(context),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  IconData _getAddressIcon(String title) {
    if (title.contains('منزل') || title.toLowerCase().contains('home')) {
      return Icons.home_rounded;
    } else if (title.contains('عمل') ||
        title.contains('مكتب') ||
        title.toLowerCase().contains('work')) {
      return Icons.business_rounded;
    }
    return Icons.location_on_rounded;
  }

  void _navigateToAddAddress(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => const AddEditAddressScreen(),
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, String id, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: const RoundedRectangleBorder(borderRadius: AppDimensions.borderRadiusMd),
        title: Text(
          isAr ? 'تأكيد الحذف' : 'Confirm Delete',
          style: const TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
        ),
        content: Text(
          isAr
              ? 'هل أنت متأكد من حذف هذا العنوان من قائمة العناوين المحفوظة؟'
              : 'Are you sure you want to delete this saved address?',
          style: const TextStyle(fontFamily: 'Cairo'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isAr ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              minimumSize: const Size(80, 36),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(addressNotifierProvider.notifier).deleteAddress(id);
            },
            child: Text(isAr ? 'حذف' : 'Delete'),
          ),
        ],
      ),
    );
  }
}

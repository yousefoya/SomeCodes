import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/routing/route_paths.dart';
import '../../../../core/widgets/custom_app_bar.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/gold_gradient_card.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/server_config_dialog.dart';
import '../../../../core/services/location/location_service_interface.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../orders/domain/entities/order_entity.dart';
import '../../../orders/presentation/controllers/orders_controller.dart';
import '../controllers/providers_controller.dart';

/// Provider for loading the current authenticated provider shop profile
final myProviderProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final repo = ref.watch(providerRepositoryProvider);
  return repo.getMyProviderProfile();
});

/// Dedicated Provider / Shop Management Dashboard Screen for بتنحل (btin7al)
class ProviderDashboardScreen extends ConsumerStatefulWidget {
  const ProviderDashboardScreen({super.key});

  @override
  ConsumerState<ProviderDashboardScreen> createState() => _ProviderDashboardScreenState();
}

class _ProviderDashboardScreenState extends ConsumerState<ProviderDashboardScreen> {
  int _currentTab = 0; // 0: Products & Availability, 1: Incoming Orders
  String _filter = 'all'; // 'all', 'available', 'unavailable'
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _processingOrderIds = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showServerConfig(BuildContext context, bool isAr) {
    ServerConfigDialog.show(context, isAr: isAr, onSaved: () {
      if (mounted) {
        ref.invalidate(myProviderProfileProvider);
        ref.read(myProviderServicesProvider.notifier).loadServices();
        ref.read(myProviderOrdersProvider.notifier).loadOrders();
      }
    });
  }

  OrderEntity _orderFromBackendJson(Map<String, dynamic> json) {
    final statusStr = json['status']?.toString() ?? 'confirmed';
    OrderStatus status;
    switch (statusStr) {
      case 'pending':
        status = OrderStatus.pending;
        break;
      case 'confirmed':
        status = OrderStatus.confirmed;
        break;
      case 'accepted':
        status = OrderStatus.accepted;
        break;
      case 'offered_to_driver':
      case 'offeredToDriver':
        status = OrderStatus.offeredToDriver;
        break;
      case 'awaiting_assignment':
      case 'awaitingAssignment':
        status = OrderStatus.awaitingAssignment;
        break;
      case 'assigned':
        status = OrderStatus.assigned;
        break;
      case 'going_to_pickup':
      case 'goingToPickup':
        status = OrderStatus.goingToPickup;
        break;
      case 'picked_up':
      case 'pickedUp':
        status = OrderStatus.pickedUp;
        break;
      case 'going_to_customer':
      case 'goingToCustomer':
        status = OrderStatus.goingToCustomer;
        break;
      case 'completed':
        status = OrderStatus.completed;
        break;
      case 'cancelled':
        status = OrderStatus.cancelled;
        break;
      case 'rejected':
        status = OrderStatus.rejected;
        break;
      case 'failed':
        status = OrderStatus.failed;
        break;
      default:
        status = OrderStatus.confirmed;
    }

    final rawItems = json['items'] as List<dynamic>? ?? [];
    final items = rawItems.map((item) {
      final iMap = item as Map<String, dynamic>;
      return OrderItemEntity(
        serviceId: iMap['serviceId']?.toString() ?? '',
        serviceOptionId: iMap['serviceOptionId']?.toString(),
        variantNameAr: iMap['variantNameAr']?.toString(),
        variantNameEn: iMap['variantNameEn']?.toString(),
        serviceNameAr: iMap['serviceNameAr']?.toString() ?? iMap['titleAr']?.toString() ?? 'خدمة بتنحل',
        serviceNameEn: iMap['serviceNameEn']?.toString() ?? iMap['titleEn']?.toString() ?? 'btin7al Service',
        unitPrice: (iMap['unitPrice'] as num?)?.toDouble() ?? 0.0,
        quantity: (iMap['quantity'] as num?)?.toInt() ?? 1,
        totalPrice: (iMap['totalPrice'] as num?)?.toDouble() ??
            ((iMap['unitPrice'] as num?)?.toDouble() ?? 0.0) * ((iMap['quantity'] as num?)?.toInt() ?? 1),
        unitAr: iMap['unitAr']?.toString() ?? '',
        unitEn: iMap['unitEn']?.toString() ?? '',
      );
    }).toList();

    final addressLat = (json['deliveryLatitude'] as num?)?.toDouble() ?? 31.9539;
    final addressLng = (json['deliveryLongitude'] as num?)?.toDouble() ?? 35.9106;

    final addr = UserAddress(
      id: 'addr_${json['id']}',
      title: json['deliveryArea']?.toString() ?? 'عنوان التوصيل',
      area: json['deliveryArea']?.toString() ?? 'عمان',
      streetAddress: json['deliveryStreetAddress']?.toString() ?? '',
      city: json['deliveryCity']?.toString() ?? 'عمان',
      buildingNumber: json['deliveryBuilding']?.toString(),
      floor: json['deliveryFloor']?.toString(),
      apartmentNumber: json['deliveryApartment']?.toString(),
      deliveryInstructions: json['deliveryInstructions']?.toString(),
      location: GeoPoint(latitude: addressLat, longitude: addressLng),
      isDefault: false,
    );

    return OrderEntity(
      id: json['id']?.toString() ?? '',
      customerId: json['customerId']?.toString(),
      customerName: json['customerName']?.toString() ?? 'عميل بتنحل',
      customerPhone: json['customerPhone']?.toString() ?? '',
      items: items,
      deliveryAddress: addr,
      serviceCategoryId: json['serviceCategoryId']?.toString() ?? 'cat_products',
      providerId: json['providerId']?.toString(),
      providerName: json['providerName']?.toString(),
      providerPhone: json['providerPhone']?.toString(),
      pickupAddress: json['pickupAddress']?.toString(),
      pickupLatitude: (json['pickupLatitude'] as num?)?.toDouble(),
      pickupLongitude: (json['pickupLongitude'] as num?)?.toDouble(),
      assignedDeliveryId: json['assignedDeliveryId']?.toString(),
      assignedDeliveryName: json['assignedDeliveryName']?.toString(),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discountAmount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? 'cash_on_delivery',
      status: status,
      notes: json['notes']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  Future<void> _handleAcceptOrder(String orderId, bool isAr) async {
    if (_processingOrderIds.contains(orderId)) return;
    setState(() => _processingOrderIds.add(orderId));

    try {
      await ref.read(myProviderOrdersProvider.notifier).acceptOrder(orderId);
      ref.read(ordersControllerProvider.notifier).providerUpdateOrderStatus(orderId, OrderStatus.accepted);

      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isAr ? 'تم قبول وتجهيز الطلب بنجاح ($orderId)' : 'Order ($orderId) accepted successfully',
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Text(
            isAr ? 'فشل قبول الطلب: $e' : 'Failed to accept order: $e',
            style: const TextStyle(fontFamily: 'Cairo', color: Colors.white),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _processingOrderIds.remove(orderId));
      }
    }
  }

  Future<void> _handleRejectOrder(String orderId, bool isAr) async {
    if (_processingOrderIds.contains(orderId)) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.cancel_outlined, color: AppColors.error, size: 24),
            const SizedBox(width: 8),
            Text(
              isAr ? 'رفض الطلب' : 'Reject Order',
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontSize: 16),
            ),
          ],
        ),
        content: Text(
          isAr
              ? 'هل أنت متأكد من رغبتك في رفض هذا الطلب؟ سيتم إشعار العميل بتعذر تلبية الطلب.'
              : 'Are you sure you want to reject this order? The customer will be notified.',
          style: const TextStyle(fontFamily: 'Cairo', color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(isAr ? 'تراجع' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo', color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(isAr ? 'تأكيد الرفض' : 'Confirm Reject', style: const TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _processingOrderIds.add(orderId));

    try {
      await ref.read(myProviderOrdersProvider.notifier).rejectOrder(orderId, notes: 'تم رفض الطلب من قبل المزود');
      ref.read(ordersControllerProvider.notifier).providerUpdateOrderStatus(orderId, OrderStatus.rejected);

      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Row(
            children: [
              const Icon(Icons.cancel_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isAr ? 'تم رفض الطلب ($orderId)' : 'Order ($orderId) rejected',
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Text(
            isAr ? 'فشل رفض الطلب: $e' : 'Failed to reject order: $e',
            style: const TextStyle(fontFamily: 'Cairo', color: Colors.white),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _processingOrderIds.remove(orderId));
      }
    }
  }

  Future<void> _handleUpdateOrderStatus(String orderId, OrderStatus newStatus, bool isAr) async {
    if (_processingOrderIds.contains(orderId)) return;
    setState(() => _processingOrderIds.add(orderId));

    try {
      final String backendStatus = newStatus == OrderStatus.goingToCustomer
          ? 'going_to_customer'
          : (newStatus == OrderStatus.completed ? 'completed' : newStatus.name);

      await ref.read(myProviderOrdersProvider.notifier).updateOrderStatus(orderId, backendStatus);
      ref.read(ordersControllerProvider.notifier).providerUpdateOrderStatus(orderId, newStatus);

      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: newStatus == OrderStatus.completed ? AppColors.success : const Color(0xFF0284C7),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Row(
            children: [
              Icon(
                newStatus == OrderStatus.completed ? Icons.task_alt_rounded : Icons.local_shipping_rounded,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  newStatus == OrderStatus.completed
                      ? (isAr ? 'تم تسليم الطلب ($orderId) بنجاح!' : 'Order ($orderId) completed!')
                      : (isAr ? 'الطلب ($orderId) قيد التوصيل الآن' : 'Order ($orderId) is out for delivery'),
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Text(
            isAr ? 'فشل تحديث حالة الطلب: $e' : 'Failed to update order status: $e',
            style: const TextStyle(fontFamily: 'Cairo', color: Colors.white),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _processingOrderIds.remove(orderId));
      }
    }
  }

  Future<void> _handleLogout() async {
    final isAr = ref.read(appLocaleProvider).languageCode == 'ar';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isAr ? 'تسجيل الخروج' : 'Logout',
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        content: Text(
          isAr ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة المتجر؟' : 'Are you sure you want to log out from provider portal?',
          style: const TextStyle(fontFamily: 'Cairo', color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo', color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(isAr ? 'خروج' : 'Logout', style: const TextStyle(fontFamily: 'Cairo', color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(authControllerProvider.notifier).logout();
      if (mounted) {
        context.go(RoutePaths.login);
      }
    }
  }

  Future<void> _toggleServiceAvailability(String serviceId, bool newValue, String serviceName, bool isAr) async {
    try {
      await ref.read(myProviderServicesProvider.notifier).toggleAvailability(serviceId, newValue);
      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: newValue ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 2),
          content: Row(
            children: [
              Icon(
                newValue ? Icons.check_circle_rounded : Icons.pause_circle_filled_rounded,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  newValue
                      ? (isAr ? 'تم تفعيل توفر "$serviceName" بنجاح' : '"$serviceName" is now available')
                      : (isAr ? 'تم إيقاف توفر "$serviceName" حالياً' : '"$serviceName" is marked unavailable'),
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Text(
            isAr ? 'فشل تحديث حالة التوفر: $e' : 'Failed to update availability: $e',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white),
          ),
        ),
      );
    }
  }

  Future<void> _toggleProviderOnlineStatus(bool newValue, bool isAr) async {
    try {
      await ref.read(providerRepositoryProvider).updateMyProviderStatus(newValue);
      ref.invalidate(myProviderProfileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: newValue ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 2),
          content: Row(
            children: [
              Icon(
                newValue ? Icons.check_circle_rounded : Icons.pause_circle_filled_rounded,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  newValue
                      ? (isAr ? 'تم تفعيل المتجر: أنت متصل الآن وتستقبل الطلبات' : 'Shop is Online & accepting orders')
                      : (isAr ? 'تم إيقاف المتجر: أنت غير متاح لاستقبال الطلبات' : 'Shop is Offline'),
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Text(
            isAr ? 'فشل تحديث حالة المتجر: $e' : 'Failed to update shop status: $e',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final profileAsync = ref.watch(myProviderProfileProvider);
    final servicesAsync = ref.watch(myProviderServicesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isAr ? 'لوحة المزود / المتجر' : 'Provider Dashboard',
        showBackButton: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_rounded, color: AppColors.goldDark, size: 22),
            tooltip: isAr ? 'المحفظة والأرباح' : 'Wallet & Earnings',
            onPressed: () => context.push(RoutePaths.providerWallet),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.goldDark, size: 22),
            tooltip: isAr ? 'تحديث البيانات' : 'Refresh',
            onPressed: () {
              ref.invalidate(myProviderProfileProvider);
              ref.read(myProviderServicesProvider.notifier).loadServices();
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings_ethernet_rounded, color: AppColors.goldDark, size: 22),
            tooltip: isAr ? 'إعدادات الخادم' : 'Server Settings',
            onPressed: () => _showServerConfig(context, isAr),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error, size: 22),
            tooltip: isAr ? 'تسجيل الخروج' : 'Logout',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myProviderProfileProvider);
          await ref.read(myProviderServicesProvider.notifier).loadServices();
        },
        color: AppColors.goldPrimary,
        child: profileAsync.when(
          loading: () => LoadingView(message: isAr ? 'جاري تحميل بيانات المتجر...' : 'Loading shop profile...'),
          error: (err, _) => ErrorView(
            message: err.toString(),
            onRetry: () {
              ref.invalidate(myProviderProfileProvider);
              ref.read(myProviderServicesProvider.notifier).loadServices();
            },
          ),
          data: (profileData) {
            if (profileData == null) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.lg),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.store_mall_directory_outlined, size: 64, color: AppColors.goldDark),
                      const SizedBox(height: 16),
                      Text(
                        isAr ? 'لم يتم العثور على متجر مرتبط بحسابك' : 'No shop linked to this account',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isAr
                            ? 'يرجى التواصل مع مسؤول النظام لربط حسابك بمركز توزيع أو متجر معتمد.'
                            : 'Please contact system admin to associate your account with an authorized provider shop.',
                        style: const TextStyle(fontSize: 13, fontFamily: 'Cairo', color: AppColors.textSecondary),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      CustomButton(
                        label: isAr ? 'تسجيل الخروج' : 'Logout',
                        icon: Icons.logout_rounded,
                        onPressed: _handleLogout,
                      ),
                    ],
                  ),
                ),
              );
            }

            final shopName = isAr
                ? (profileData['nameAr']?.toString() ?? 'متجر بتنحل')
                : (profileData['nameEn']?.toString() ?? 'btin7al Shop');
            final phone = profileData['phoneNumber']?.toString() ?? user?.phoneNumber ?? '';
            final address = profileData['address']?.toString() ?? '';
            final operatingHours = profileData['operatingHours']?.toString() ?? '08:00 AM - 10:00 PM';
            final isActive = profileData['isActive'] == true;
            final List<dynamic> coverageAreas = profileData['coverageAreas'] as List<dynamic>? ?? [];

            return servicesAsync.when(
              loading: () => LoadingView(message: isAr ? 'جاري تحميل قائمة المنتجات والخدمات...' : 'Loading products...'),
              error: (err, _) => ErrorView(
                message: err.toString(),
                onRetry: () => ref.read(myProviderServicesProvider.notifier).loadServices(),
              ),
              data: (servicesList) {
                final totalCount = servicesList.length;
                final availableCount = servicesList.where((s) => s['isAvailable'] == true).length;
                final unavailableCount = totalCount - availableCount;

                // Apply search & filter
                final filteredServices = servicesList.where((s) {
                  final nameAr = s['nameAr']?.toString().toLowerCase() ?? '';
                  final nameEn = s['nameEn']?.toString().toLowerCase() ?? '';
                  final matchesSearch = _searchQuery.isEmpty ||
                      nameAr.contains(_searchQuery.toLowerCase()) ||
                      nameEn.contains(_searchQuery.toLowerCase());

                  if (!matchesSearch) return false;

                  if (_filter == 'available') {
                    return s['isAvailable'] == true;
                  } else if (_filter == 'unavailable') {
                    return s['isAvailable'] != true;
                  }
                  return true;
                }).toList();

                return ListView(
                  padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
                  children: [
                    // 1. Shop Overview Card
                    GoldGradientCard(
                      hasGoldBorder: true,
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: AppColors.goldPrimary.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: AppColors.goldPrimary),
                                ),
                                child: const Icon(Icons.storefront_rounded, color: AppColors.goldDark, size: 28),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      shopName,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.textPrimary,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      phone,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.goldDark,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? AppColors.success.withValues(alpha: 0.15)
                                      : AppColors.error.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: isActive ? AppColors.success : AppColors.error,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isActive ? Icons.check_circle_rounded : Icons.pause_circle_filled_rounded,
                                      size: 14,
                                      color: isActive ? AppColors.success : AppColors.error,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      isActive ? (isAr ? 'متجر نشط' : 'Active Shop') : (isAr ? 'غير متاح' : 'Inactive'),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: isActive ? AppColors.success : AppColors.error,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          if (address.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            const Divider(color: AppColors.border, height: 1),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 16, color: AppColors.goldDark),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    address,
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Cairo'),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.access_time_rounded, size: 16, color: AppColors.goldDark),
                              const SizedBox(width: 6),
                              Text(
                                operatingHours,
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Cairo'),
                              ),
                            ],
                          ),
                          if (coverageAreas.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: coverageAreas.map((area) {
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Text(
                                    '📍 ${area.toString()}',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.textSecondary),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                          const SizedBox(height: 12),
                          const Divider(color: AppColors.border, height: 1),
                          const SizedBox(height: 10),

                          // Online / Offline Store Availability Toggle
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isAr ? 'حالة استقبال الطلبات العامة:' : 'General Store Availability:',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
                                  ),
                                  Text(
                                    profileData['isAvailable'] == true
                                        ? (isAr ? '🟢 متصل ومتاح للطلب الفوري' : '🟢 Online & accepting orders')
                                        : (isAr ? '🔴 غير متوفر / مغلق حالياً' : '🔴 Offline / Closed'),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      fontFamily: 'Cairo',
                                      color: profileData['isAvailable'] == true ? AppColors.success : AppColors.error,
                                    ),
                                  ),
                                ],
                              ),
                              Switch.adaptive(
                                value: profileData['isAvailable'] == true,
                                activeThumbColor: AppColors.success,
                                activeTrackColor: AppColors.success.withValues(alpha: 0.4),
                                inactiveThumbColor: AppColors.error,
                                inactiveTrackColor: AppColors.error.withValues(alpha: 0.3),
                                onChanged: (val) => _toggleProviderOnlineStatus(val, isAr),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () => context.push(RoutePaths.providerWallet),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                              decoration: BoxDecoration(
                                color: AppColors.goldPrimary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.35)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.account_balance_wallet_rounded, color: AppColors.goldDark, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        isAr ? 'المحفظة والأرباح وسحب الرصيد' : 'Wallet, Earnings & Withdrawals',
                                        style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Icon(Icons.arrow_forward_ios_rounded, size: 13, color: AppColors.goldDark),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 3-Tab Switcher
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _currentTab = 0),
                              borderRadius: BorderRadius.circular(9),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: _currentTab == 0 ? AppColors.goldPrimary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.inventory_2_rounded,
                                      size: 15,
                                      color: _currentTab == 0 ? Colors.white : AppColors.textSecondary,
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        isAr ? 'الخدمات' : 'Services',
                                        style: TextStyle(
                                          fontFamily: 'Cairo',
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: _currentTab == 0 ? Colors.white : AppColors.textSecondary,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _currentTab = 1),
                              borderRadius: BorderRadius.circular(9),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: _currentTab == 1 ? AppColors.goldPrimary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.receipt_long_rounded,
                                      size: 15,
                                      color: _currentTab == 1 ? Colors.white : AppColors.textSecondary,
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        isAr ? 'الطلبات' : 'Orders',
                                        style: TextStyle(
                                          fontFamily: 'Cairo',
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: _currentTab == 1 ? Colors.white : AppColors.textSecondary,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _currentTab = 2),
                              borderRadius: BorderRadius.circular(9),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: _currentTab == 2 ? AppColors.goldPrimary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.store_rounded,
                                      size: 15,
                                      color: _currentTab == 2 ? Colors.white : AppColors.textSecondary,
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        isAr ? 'بيانات المتجر' : 'Profile',
                                        style: TextStyle(
                                          fontFamily: 'Cairo',
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: _currentTab == 2 ? Colors.white : AppColors.textSecondary,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (_currentTab == 1)
                      _buildOrdersTab(context, profileData, isAr)
                    else if (_currentTab == 2)
                      _ProviderProfileEditor(profileData: profileData, isAr: isAr)
                    else ...[
                      // 2. Availability KPIs
                      Row(
                        children: [
                          Expanded(
                            child: _buildKpiCard(
                              title: isAr ? 'المصرح بها' : 'Assigned',
                              count: totalCount,
                              icon: Icons.inventory_2_outlined,
                              color: AppColors.goldDark,
                              bgColor: AppColors.goldPrimary.withValues(alpha: 0.1),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildKpiCard(
                              title: isAr ? 'متوفر الآن' : 'Available',
                              count: availableCount,
                              icon: Icons.check_circle_outline_rounded,
                              color: AppColors.success,
                              bgColor: AppColors.success.withValues(alpha: 0.1),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildKpiCard(
                              title: isAr ? 'غير متوفر' : 'Unavailable',
                              count: unavailableCount,
                              icon: Icons.remove_circle_outline_rounded,
                              color: AppColors.error,
                              bgColor: AppColors.error.withValues(alpha: 0.1),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 14),

                    // 3. Information Notice Banner
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.info.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline_rounded, color: AppColors.info, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              isAr
                                  ? 'المنتجات المصرحة لمتجرك من قِبل الإدارة. يمكنك تفعيل أو إيقاف التوفر الفوري للمنتج في أي وقت.'
                                  : 'Products assigned by Admin. You can toggle instant availability for customers at any time.',
                              style: const TextStyle(fontSize: 11, fontFamily: 'Cairo', color: AppColors.textSecondary, height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 4. Search and Filter Bar
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
                              decoration: InputDecoration(
                                hintText: isAr ? 'بحث في المنتجات...' : 'Search products...',
                                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.textMuted),
                                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.textMuted),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                                isDense: true,
                              ),
                              onChanged: (val) {
                                setState(() {
                                  _searchQuery = val;
                                });
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Filter Chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip(
                            label: isAr ? 'الكل ($totalCount)' : 'All ($totalCount)',
                            isSelected: _filter == 'all',
                            onTap: () => setState(() => _filter = 'all'),
                          ),
                          const SizedBox(width: 8),
                          _buildFilterChip(
                            label: isAr ? '🟢 متوفر الآن ($availableCount)' : '🟢 Available ($availableCount)',
                            isSelected: _filter == 'available',
                            onTap: () => setState(() => _filter = 'available'),
                          ),
                          const SizedBox(width: 8),
                          _buildFilterChip(
                            label: isAr ? '🔴 غير متوفر ($unavailableCount)' : '🔴 Unavailable ($unavailableCount)',
                            isSelected: _filter == 'unavailable',
                            onTap: () => setState(() => _filter = 'unavailable'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 5. Products List
                    if (filteredServices.isEmpty)
                      EmptyView(
                        title: isAr ? 'لا توجد منتجات مطابقة' : 'No Matching Products',
                        message: isAr
                            ? (_searchQuery.isNotEmpty
                                ? 'لم يتم العثور على نتائج للبحث "$_searchQuery"'
                                : 'لا توجد منتجات تندرج تحت هذا الفلتر')
                            : 'No products found matching your current filter',
                        icon: Icons.inventory_2_outlined,
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filteredServices.length,
                        itemBuilder: (context, index) {
                          final srv = filteredServices[index];
                          final serviceId = srv['id']?.toString() ?? '';
                          final nameAr = srv['nameAr']?.toString() ?? '';
                          final nameEn = srv['nameEn']?.toString() ?? '';
                          final displayName = isAr ? (nameAr.isNotEmpty ? nameAr : nameEn) : (nameEn.isNotEmpty ? nameEn : nameAr);
                          final price = (srv['basePrice'] as num?)?.toDouble() ?? 0.0;
                          final unit = isAr ? (srv['unitAr']?.toString() ?? '') : (srv['unitEn']?.toString() ?? '');
                          final isAvailable = srv['isAvailable'] == true;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isAvailable ? AppColors.borderGold : AppColors.border,
                                width: isAvailable ? 1.2 : 1.0,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Icon
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: isAvailable
                                        ? AppColors.goldPrimary.withValues(alpha: 0.12)
                                        : AppColors.backgroundSecondary,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isAvailable
                                          ? AppColors.goldPrimary.withValues(alpha: 0.3)
                                          : AppColors.border,
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.local_fire_department_rounded,
                                    color: isAvailable ? AppColors.goldDark : AppColors.textMuted,
                                    size: 26,
                                  ),
                                ),
                                const SizedBox(width: 12),

                                // Details
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        displayName,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          fontFamily: 'Cairo',
                                          color: isAvailable ? AppColors.textPrimary : AppColors.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          Text(
                                            '${price.toStringAsFixed(2)} د.أ',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w900,
                                              color: AppColors.goldDark,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                          if (unit.isNotEmpty) ...[
                                            const SizedBox(width: 4),
                                            Text(
                                              '/ $unit',
                                              style: const TextStyle(
                                                fontSize: 11,
                                                fontFamily: 'Cairo',
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      // Status badge
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isAvailable
                                              ? AppColors.success.withValues(alpha: 0.12)
                                              : AppColors.error.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: isAvailable
                                                ? AppColors.success.withValues(alpha: 0.3)
                                                : AppColors.error.withValues(alpha: 0.3),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isAvailable
                                                  ? Icons.check_circle_rounded
                                                  : Icons.remove_circle_outline_rounded,
                                              size: 12,
                                              color: isAvailable ? AppColors.success : AppColors.error,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              isAvailable
                                                  ? (isAr ? 'متوفر الآن' : 'Available Now')
                                                  : (isAr ? 'غير متوفر الآن' : 'Unavailable'),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w800,
                                                color: isAvailable ? AppColors.success : AppColors.error,
                                                fontFamily: 'Cairo',
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(width: 8),

                                // Toggle Switch
                                Column(
                                  children: [
                                    Switch.adaptive(
                                      value: isAvailable,
                                      activeThumbColor: AppColors.success,
                                      activeTrackColor: AppColors.success.withValues(alpha: 0.4),
                                      inactiveThumbColor: AppColors.error,
                                      inactiveTrackColor: AppColors.error.withValues(alpha: 0.3),
                                      onChanged: (newVal) => _toggleServiceAvailability(
                                        serviceId,
                                        newVal,
                                        displayName,
                                        isAr,
                                      ),
                                    ),
                                    Text(
                                      isAvailable ? (isAr ? 'متاح' : 'ON') : (isAr ? 'معطل' : 'OFF'),
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        fontFamily: 'Cairo',
                                        color: isAvailable ? AppColors.success : AppColors.error,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildOrdersTab(BuildContext context, Map<String, dynamic> profileData, bool isAr) {
    final ordersAsync = ref.watch(myProviderOrdersProvider);
    final allLocalOrders = ref.watch(ordersControllerProvider);
    final providerId = profileData['id']?.toString() ?? '';
    final providerPhone = profileData['phoneNumber']?.toString() ?? '';

    // Merge backend orders + local orders
    final Map<String, OrderEntity> mergedOrdersMap = {};

    // 1. Add local orders matching this provider
    for (final lo in allLocalOrders) {
      if ((lo.providerId != null && lo.providerId == providerId) ||
          (lo.providerPhone != null && providerPhone.isNotEmpty && lo.providerPhone == providerPhone)) {
        mergedOrdersMap[lo.id] = lo;
      }
    }

    // 2. Add backend orders
    ordersAsync.whenData((backendList) {
      for (final json in backendList) {
        final order = _orderFromBackendJson(json);
        mergedOrdersMap[order.id] = order;
      }
    });

    final myOrders = mergedOrdersMap.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final totalCount = myOrders.length;
    final newCount = myOrders
        .where((o) =>
            o.status == OrderStatus.confirmed ||
            o.status == OrderStatus.pending ||
            o.status == OrderStatus.awaitingAssignment ||
            o.status == OrderStatus.offeredToDriver ||
            o.status == OrderStatus.assigned)
        .length;
    final activeCount = myOrders
        .where((o) =>
            o.status == OrderStatus.accepted ||
            o.status == OrderStatus.goingToCustomer ||
            o.status == OrderStatus.goingToPickup ||
            o.status == OrderStatus.pickedUp)
        .length;
    final completedCount = myOrders.where((o) => o.status == OrderStatus.completed).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Orders KPIs
        Row(
          children: [
            Expanded(
              child: _buildKpiCard(
                title: isAr ? 'إجمالي الطلبات' : 'Total',
                count: totalCount,
                icon: Icons.receipt_long_rounded,
                color: AppColors.goldDark,
                bgColor: AppColors.goldPrimary.withValues(alpha: 0.1),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildKpiCard(
                title: isAr ? 'جديدة' : 'New',
                count: newCount,
                icon: Icons.notifications_active_rounded,
                color: AppColors.warning,
                bgColor: AppColors.warning.withValues(alpha: 0.1),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildKpiCard(
                title: isAr ? 'قيد التوصيل' : 'Delivery',
                count: activeCount,
                icon: Icons.local_shipping_rounded,
                color: const Color(0xFF0284C7),
                bgColor: const Color(0xFF0284C7).withValues(alpha: 0.1),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildKpiCard(
                title: isAr ? 'مكتمل' : 'Delivered',
                count: completedCount,
                icon: Icons.check_circle_rounded,
                color: AppColors.success,
                bgColor: AppColors.success.withValues(alpha: 0.1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        if (ordersAsync.isLoading && myOrders.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: LoadingView(message: isAr ? 'جاري تحميل الطلبات الواردة...' : 'Loading incoming orders...'),
          )
        else if (ordersAsync.hasError && myOrders.isEmpty)
          ErrorView(
            message: ordersAsync.error.toString(),
            onRetry: () => ref.read(myProviderOrdersProvider.notifier).loadOrders(),
          )
        else if (myOrders.isEmpty)
          EmptyView(
            title: isAr ? 'لا توجد طلبات واردة حالياً' : 'No Incoming Orders',
            message: isAr
                ? 'ستظهر الطلبات الجديدة الموجهة لمتجرك هنا فور قيام العملاء بالطلب، وستتمكن من قبولها أو رفضها وإدارتها مباشرة.'
                : 'Incoming orders assigned to your shop for fulfillment and delivery will appear here.',
            icon: Icons.receipt_long_outlined,
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: myOrders.length,
            itemBuilder: (context, index) {
              final order = myOrders[index];
              return _buildProviderOrderCard(context, order, isAr);
            },
          ),
      ],
    );
  }

  Widget _buildProviderOrderCard(BuildContext context, OrderEntity order, bool isAr) {
    Color statusBg;
    Color statusFg;
    String statusText;

    final isProcessing = _processingOrderIds.contains(order.id);

    switch (order.status) {
      case OrderStatus.confirmed:
      case OrderStatus.pending:
      case OrderStatus.awaitingAssignment:
      case OrderStatus.offeredToDriver:
      case OrderStatus.assigned:
        statusBg = const Color(0xFFEFF6FF);
        statusFg = const Color(0xFF2563EB);
        statusText = isAr ? 'طلب جديد (بانتظار قرار المزود)' : 'New Order (Action Required)';
        break;
      case OrderStatus.accepted:
        statusBg = const Color(0xFFF3E8FF);
        statusFg = const Color(0xFF7C3AED);
        statusText = isAr ? 'تم القبول (قيد التجهيز)' : 'In Preparation';
        break;
      case OrderStatus.goingToPickup:
      case OrderStatus.pickedUp:
      case OrderStatus.goingToCustomer:
        statusBg = const Color(0xFFE0F2FE);
        statusFg = const Color(0xFF0284C7);
        statusText = isAr ? 'في طريق التوصيل للعميل' : 'Out for Delivery';
        break;
      case OrderStatus.completed:
        statusBg = AppColors.success.withValues(alpha: 0.12);
        statusFg = AppColors.success;
        statusText = isAr ? 'تم التسليم بنجاح' : 'Delivered';
        break;
      case OrderStatus.rejected:
        statusBg = AppColors.error.withValues(alpha: 0.12);
        statusFg = AppColors.error;
        statusText = isAr ? 'تم رفض الطلب من المتجر' : 'Rejected by Provider';
        break;
      case OrderStatus.cancelled:
        statusBg = AppColors.error.withValues(alpha: 0.12);
        statusFg = AppColors.error;
        statusText = isAr ? 'ملغي' : 'Cancelled';
        break;
      default:
        statusBg = AppColors.backgroundSecondary;
        statusFg = AppColors.textSecondary;
        statusText = isAr ? order.status.getLabelAr() : order.status.getLabelEn();
    }

    final isWaitingForProviderAction =
        order.status == OrderStatus.confirmed ||
        order.status == OrderStatus.pending ||
        order.status == OrderStatus.awaitingAssignment ||
        order.status == OrderStatus.offeredToDriver ||
        order.status == OrderStatus.assigned;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isWaitingForProviderAction
              ? AppColors.goldPrimary
              : (order.isActive ? AppColors.borderGold : AppColors.border),
          width: isWaitingForProviderAction ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isWaitingForProviderAction ? 0.07 : 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: ID & Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                order.id,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: AppColors.goldDark,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusFg.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: statusFg,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Customer info & address
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 16, color: AppColors.goldDark),
              const SizedBox(width: 6),
              Text(
                '${order.customerName ?? (isAr ? "عميل" : "Customer")} (${order.customerPhone ?? "-"})',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo', color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: AppColors.goldDark),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  order.deliveryAddress.fullAddressText,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Cairo'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(color: AppColors.border, height: 1),
          const SizedBox(height: 10),

          // Items summary
          Text(
            isAr ? 'المنتجات المطلوبة:' : 'Ordered Items:',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textMuted),
          ),
          const SizedBox(height: 4),
          ...order.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '• ${item.quantity}x ${isAr ? item.serviceNameAr : item.serviceNameEn}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.textPrimary),
                    ),
                    Text(
                      '${item.totalPrice.toStringAsFixed(2)} د.أ',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.goldDark),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 10),

          // Total Amount & Delivery fee
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isAr ? 'الإجمالي (توصيل: 0.00 د.أ):' : 'Total (Delivery: 0.00 JOD):',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: AppColors.textSecondary),
              ),
              Text(
                '${order.totalAmount.toStringAsFixed(2)} د.أ',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, fontFamily: 'Cairo', color: AppColors.goldDark),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Action Buttons for Provider
          if (isWaitingForProviderAction)
            Row(
              children: [
                // 1. Accept Order Button
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: isProcessing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_circle_rounded, size: 18),
                    label: Text(
                      isAr ? 'قبول الطلب' : 'Accept Order',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                    ),
                    onPressed: isProcessing ? null : () => _handleAcceptOrder(order.id, isAr),
                  ),
                ),
                const SizedBox(width: 8),

                // 2. Reject Order Button
                Expanded(
                  flex: 2,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error, width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.cancel_outlined, size: 18),
                    label: Text(
                      isAr ? 'رفض الطلب' : 'Reject',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                    ),
                    onPressed: isProcessing ? null : () => _handleRejectOrder(order.id, isAr),
                  ),
                ),
              ],
            )
          else if (order.status == OrderStatus.accepted)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: isProcessing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.local_shipping_rounded, size: 18),
                label: Text(
                  isAr ? 'بدء التوصيل للعميل' : 'Start Delivery to Customer',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                ),
                onPressed: isProcessing ? null : () => _handleUpdateOrderStatus(order.id, OrderStatus.goingToCustomer, isAr),
              ),
            )
          else if (order.status == OrderStatus.goingToCustomer || order.status == OrderStatus.goingToPickup || order.status == OrderStatus.pickedUp)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: isProcessing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.task_alt_rounded, size: 18),
                label: Text(
                  isAr ? 'تأكيد التسليم بنجاح للعميل' : 'Confirm Delivered to Customer',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                ),
                onPressed: isProcessing ? null : () => _handleUpdateOrderStatus(order.id, OrderStatus.completed, isAr),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required int count,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 6),
          Text(
            '$count',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              fontFamily: 'Cairo',
              color: color,
            ),
          ),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              fontFamily: 'Cairo',
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.goldPrimary : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.goldPrimary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            fontFamily: 'Cairo',
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

/// Store Profile Editor Tab for Provider Dashboard
class _ProviderProfileEditor extends ConsumerStatefulWidget {
  final Map<String, dynamic> profileData;
  final bool isAr;

  const _ProviderProfileEditor({
    required this.profileData,
    required this.isAr,
  });

  @override
  ConsumerState<_ProviderProfileEditor> createState() => _ProviderProfileEditorState();
}

class _ProviderProfileEditorState extends ConsumerState<_ProviderProfileEditor> {
  late final TextEditingController _nameArController;
  late final TextEditingController _nameEnController;
  late final TextEditingController _addressController;
  late final TextEditingController _hoursController;
  late final TextEditingController _descArController;
  late final TextEditingController _descEnController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profileData;
    _nameArController = TextEditingController(text: p['nameAr']?.toString() ?? '');
    _nameEnController = TextEditingController(text: p['nameEn']?.toString() ?? '');
    _addressController = TextEditingController(text: p['address']?.toString() ?? '');
    _hoursController = TextEditingController(text: p['operatingHours']?.toString() ?? '08:00 AM - 10:00 PM');
    _descArController = TextEditingController(text: p['descriptionAr']?.toString() ?? '');
    _descEnController = TextEditingController(text: p['descriptionEn']?.toString() ?? '');
  }

  @override
  void dispose() {
    _nameArController.dispose();
    _nameEnController.dispose();
    _addressController.dispose();
    _hoursController.dispose();
    _descArController.dispose();
    _descEnController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    final isAr = widget.isAr;
    final nameAr = _nameArController.text.trim();
    if (nameAr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isAr ? 'يرجى إدخال اسم المتجر' : 'Please enter store name'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final updateMap = {
        'nameAr': nameAr,
        'nameEn': _nameEnController.text.trim().isEmpty ? nameAr : _nameEnController.text.trim(),
        'address': _addressController.text.trim(),
        'operatingHours': _hoursController.text.trim(),
        'descriptionAr': _descArController.text.trim(),
        'descriptionEn': _descEnController.text.trim(),
      };

      await ref.read(providerRepositoryProvider).updateMyProviderProfile(updateMap);
      ref.invalidate(myProviderProfileProvider);

      if (!mounted) return;
      setState(() => _isSaving = false);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                isAr ? 'تم حفظ وتحديث بيانات المتجر بنجاح' : 'Store profile updated successfully',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
              ),
            ],
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr ? 'فشل حفظ التعديلات: $e' : 'Failed to save store profile: $e',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = widget.isAr;

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
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.goldLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.store_rounded, color: AppColors.goldDark, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                isAr ? 'تعديل بيانات المتجر والوصف' : 'Edit Store Profile',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Name AR
          Text(
            isAr ? 'اسم المتجر (عربي)*' : 'Store Name (Arabic)*',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _nameArController,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            decoration: InputDecoration(
              hintText: isAr ? 'مثال: مركز النصر للغاز والمياه' : 'Store Name AR',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 12),

          // Name EN
          Text(
            isAr ? 'اسم المتجر (إنجليزي)' : 'Store Name (English)',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _nameEnController,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            decoration: InputDecoration(
              hintText: 'e.g. Al-Nasr Hub',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 12),

          // Address & Hours
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isAr ? 'العنوان ومنطقة التغطية' : 'Address',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _addressController,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
                      decoration: InputDecoration(
                        hintText: isAr ? 'عمان - شارع وصفي التل' : 'Address',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isAr ? 'أوقات وساعات العمل' : 'Operating Hours',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _hoursController,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
                      decoration: InputDecoration(
                        hintText: '08:00 AM - 10:00 PM',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Description AR
          Text(
            isAr ? 'نبذة عن المتجر (عربي)' : 'Store Description (Arabic)',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _descArController,
            maxLines: 3,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            decoration: InputDecoration(
              hintText: isAr ? 'اكتب نبذة ومواصفات المتجر هنا...' : 'Store description in Arabic...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 12),

          // Description EN
          Text(
            isAr ? 'نبذة عن المتجر (إنجليزي)' : 'Store Description (English)',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _descEnController,
            maxLines: 2,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Store description in English...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 18),

          // Save Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.goldPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: _isSaving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save_rounded, size: 20),
              label: Text(
                _isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ تعديلات المتجر' : 'Save Store Changes'),
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 14),
              ),
              onPressed: _isSaving ? null : _saveProfile,
            ),
          ),
        ],
      ),
    );
  }
}

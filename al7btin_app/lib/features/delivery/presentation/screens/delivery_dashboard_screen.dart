import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/routing/route_paths.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/gold_gradient_card.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../orders/domain/entities/order_entity.dart';
import '../../../orders/presentation/controllers/orders_controller.dart';
import '../../domain/entities/delivery_employee_entity.dart';
import '../controllers/delivery_controller.dart';

/// Dedicated Mobile-First Delivery Dashboard for بتنحل (btin7al) with Acceptance/Rejection and Full Delivery Pipeline
class DeliveryDashboardScreen extends ConsumerStatefulWidget {
  const DeliveryDashboardScreen({super.key});

  @override
  ConsumerState<DeliveryDashboardScreen> createState() => _DeliveryDashboardScreenState();
}

class _DeliveryDashboardScreenState extends ConsumerState<DeliveryDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final user = ref.watch(authControllerProvider).user;
    final allOrders = ref.watch(ordersControllerProvider);
    final drivers = ref.watch(deliveryEmployeesControllerProvider);

    // Identify current driver entity
    final driverEntity = drivers.firstWhere(
      (d) => d.phoneNumber == user?.phoneNumber || d.id == user?.id,
      orElse: () => drivers.isNotEmpty
          ? drivers.first
          : DeliveryEmployeeEntity(
              id: 'DRV-101',
              name: 'أحمد الخلايلة',
              phoneNumber: '0798881122',
              vehicleType: 'دراجة نارية',
              vehiclePlateNumber: '11-11111',
              createdAt: DateTime.now(),
            ),
    );

    final driverId = driverEntity.id;
    final isOnline = driverEntity.isOnline && driverEntity.isActive;

    // Active orders assigned or offered to this driver
    final activeOrders = allOrders.where((o) {
      final isAssignedToMe = o.assignedDeliveryId == driverId;
      final isOfferedToMe = o.offeredToDriverId == driverId && o.status == OrderStatus.offeredToDriver;
      return (isAssignedToMe || isOfferedToMe) && o.isActive;
    }).toList();

    // Completed orders
    final completedOrders = allOrders.where((o) =>
        o.assignedDeliveryId == driverId &&
        (o.status == OrderStatus.completed || o.status == OrderStatus.failed)).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isOnline ? AppColors.success : AppColors.textMuted,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                isOnline ? (isAr ? 'متاح للتوصيل' : 'ONLINE') : (isAr ? 'غير متاح' : 'OFFLINE'),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 10,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    driverEntity.name,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${driverEntity.vehicleType} • ${driverEntity.phoneNumber}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 10, fontFamily: 'Cairo'),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.language_rounded, color: AppColors.goldDark, size: 20),
            tooltip: isAr ? 'English' : 'العربية',
            onPressed: () => ref.read(appLocaleProvider.notifier).toggleLocale(),
          ),
          IconButton(
            icon: Icon(
              isOnline ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
              color: isOnline ? AppColors.success : AppColors.textMuted,
              size: 28,
            ),
            tooltip: isAr ? 'تبديل حالة التوفر' : 'Toggle Availability',
            onPressed: () {
              ref.read(deliveryEmployeesControllerProvider.notifier).toggleOnlineStatus(driverId);
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error, size: 20),
            tooltip: isAr ? 'تسجيل الخروج' : 'Logout',
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) {
                context.go(RoutePaths.login);
              }
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.goldDark,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.goldPrimary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Cairo', fontSize: 13),
          tabs: [
            Tab(
              icon: const Icon(Icons.delivery_dining_rounded, size: 18),
              text: '${isAr ? 'الطلبات النشطة' : 'Active Orders'} (${activeOrders.length})',
            ),
            Tab(
              icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
              text: '${isAr ? 'المكتملة' : 'Completed'} (${completedOrders.length})',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildActiveOrdersTab(context, activeOrders, driverId, isAr),
          _buildCompletedOrdersTab(context, completedOrders, isAr),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 1: ACTIVE ORDERS & DISPATCH PIPELINE
  // ==========================================
  Widget _buildActiveOrdersTab(
    BuildContext context,
    List<OrderEntity> orders,
    String currentDriverId,
    bool isAr,
  ) {
    if (orders.isEmpty) {
      return EmptyView(
        title: isAr ? 'لا توجد مهام توصيل حالية' : 'No Active Delivery Tasks',
        message: isAr
            ? 'أنت متصل بالخدمة وسيصلك إشعار فوري عند إسناد طلبات جديدة إليك.'
            : 'You are online and ready to receive incoming orders automatically.',
        icon: Icons.two_wheeler_rounded,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppDimensions.md),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 14),
      itemBuilder: (context, index) {
        final order = orders[index];
        final isOffered = order.status == OrderStatus.offeredToDriver && order.offeredToDriverId == currentDriverId;

        return GoldGradientCard(
          hasGoldBorder: isOffered,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Offered Order Highlight Alert Banner
              if (isOffered) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.goldDark,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.notifications_active_rounded, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          isAr ? '🚨 طلب توصيل جديد معروض عليك! يرجى القبول أو الرفض' : '🚨 New delivery order offered! Please Accept or Decline',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11, fontFamily: 'Cairo'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Order ID & Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    order.id,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                      color: AppColors.goldDark,
                      letterSpacing: 1.1,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isOffered ? AppColors.goldPrimary.withValues(alpha: 0.15) : AppColors.success.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: isOffered ? AppColors.goldPrimary : AppColors.success,
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      isAr ? order.status.getLabelAr() : order.status.getLabelEn(),
                      style: TextStyle(
                        color: isOffered ? AppColors.goldDark : AppColors.success,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Pickup Location / Provider Info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.storefront_rounded, size: 16, color: AppColors.goldDark),
                            const SizedBox(width: 6),
                            Text(
                              isAr ? 'موقع الاستلام (المتجر/المزود):' : 'Pickup Location (Provider):',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                        if (order.providerPhone != null)
                          GestureDetector(
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${isAr ? 'الاتصال بالمزود' : 'Calling provider'}: ${order.providerPhone}'), backgroundColor: AppColors.goldDark),
                              );
                            },
                            child: Row(
                              children: [
                                const Icon(Icons.phone_in_talk_rounded, size: 14, color: AppColors.success),
                                const SizedBox(width: 4),
                                Text(order.providerPhone!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success)),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${order.providerName ?? 'المزود المعتمد'}\n📍 ${order.pickupAddress ?? 'عمان المركزية'}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Cairo', height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.goldDark,
                        side: const BorderSide(color: AppColors.goldPrimary),
                        minimumSize: const Size(0, 30),
                        padding: const EdgeInsets.symmetric(vertical: 4),
                      ),
                      icon: const Icon(Icons.directions_outlined, size: 14),
                      label: Text(isAr ? '🗺️ توجيه إلى موقع الاستلام (GPS)' : '🗺️ Navigate to Pickup', style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w700)),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(isAr ? 'فتح الملاحة إلى نقطة الاستلام: ${order.pickupAddress}' : 'Opening navigation to pickup'), backgroundColor: AppColors.goldDark),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // Customer Delivery Location Info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.location_on_rounded, size: 16, color: AppColors.error),
                            const SizedBox(width: 6),
                            Text(
                              isAr ? 'عنوان تسليم العميل:' : 'Customer Delivery Address:',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, fontFamily: 'Cairo', color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                        if (order.customerPhone != null)
                          ElevatedButton.icon(
                            icon: const Icon(Icons.call_rounded, size: 12),
                            label: Text(order.customerPhone!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, fontFamily: 'Cairo')),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.success,
                              foregroundColor: Colors.white,
                              minimumSize: const Size(70, 24),
                              padding: const EdgeInsets.symmetric(horizontal: 6),
                            ),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${isAr ? 'الاتصال بالعميل' : 'Calling customer'}: ${order.customerPhone}'), backgroundColor: AppColors.success),
                              );
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${order.customerName ?? 'عميل بتنحل'}\n📍 ${order.deliveryAddress.city} - ${order.deliveryAddress.area} - ${order.deliveryAddress.streetAddress}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Cairo', height: 1.3),
                    ),
                    if (order.notes != null && order.notes!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('📝 ${isAr ? 'ملاحظة' : 'Note'}: ${order.notes}', style: const TextStyle(fontSize: 10, color: AppColors.goldDark, fontWeight: FontWeight.w700, fontFamily: 'Cairo')),
                    ],
                    const SizedBox(height: 6),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.textPrimary,
                        side: const BorderSide(color: AppColors.border),
                        minimumSize: const Size(0, 30),
                        padding: const EdgeInsets.symmetric(vertical: 4),
                      ),
                      icon: const Icon(Icons.navigation_outlined, size: 14),
                      label: Text(isAr ? '🗺️ توجيه إلى موقع العميل (GPS)' : '🗺️ Navigate to Customer', style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w700)),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(isAr ? 'فتح الملاحة إلى عنوان العميل: ${order.deliveryAddress.area}' : 'Opening navigation to customer'), backgroundColor: AppColors.textPrimary),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // Items Summary
              ...order.items.map((it) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('• ${it.quantity}x ${isAr ? it.serviceNameAr : it.serviceNameEn}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Cairo')),
                        Text('${it.totalPrice.toStringAsFixed(2)} JOD', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                      ],
                    ),
                  )),
              const Divider(height: 14),

              // Total & Payment
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(isAr ? 'المطلوب تحصيله' : 'Amount to Collect', style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontFamily: 'Cairo')),
                      Text('${order.totalAmount.toStringAsFixed(2)} JOD', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.goldDark, fontFamily: 'Cairo')),
                    ],
                  ),
                  Text(order.paymentMethod, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary, fontFamily: 'Cairo')),
                ],
              ),
              const SizedBox(height: 14),

              // Action Buttons along the Delivery Pipeline
              _buildPipelineActions(context, order: order, driverId: currentDriverId, isAr: isAr),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPipelineActions(
    BuildContext context, {
    required OrderEntity order,
    required String driverId,
    required bool isAr,
  }) {
    // 1. Offered Order: Accept or Reject
    if (order.status == OrderStatus.offeredToDriver) {
      return Row(
        children: [
          Expanded(
            flex: 3,
            child: CustomButton(
              label: isAr ? 'قبول واستلام الطلب ✅' : 'Accept Order ✅',
              icon: Icons.check_circle_outline_rounded,
              onPressed: () {
                ref.read(ordersControllerProvider.notifier).driverAcceptOrder(order.id, driverId);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(isAr ? 'تم قبول الطلب بنجاح! يرجى التوجه للاستلام' : 'Order accepted successfully! Proceed to pickup'), backgroundColor: AppColors.success),
                );
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                minimumSize: const Size(0, AppDimensions.buttonHeightMd),
              ),
              onPressed: () {
                ref.read(ordersControllerProvider.notifier).driverRejectOrder(order.id, driverId);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(isAr ? 'تم رفض الطلب وتحويله لمندوب آخر' : 'Order declined and re-routed'), backgroundColor: AppColors.warning),
                );
              },
              child: Text(isAr ? 'رفض' : 'Decline', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 12)),
            ),
          ),
        ],
      );
    }

    // 2. Accepted -> Start Going to Pickup
    if (order.status == OrderStatus.accepted || order.status == OrderStatus.assigned) {
      return CustomButton(
        label: isAr ? 'الانطلاق إلى موقع الاستلام 🚚' : 'Going to Pickup 🚚',
        icon: Icons.navigation_rounded,
        onPressed: () {
          ref.read(ordersControllerProvider.notifier).driverUpdatePipelineStatus(order.id, OrderStatus.goingToPickup);
        },
      );
    }

    // 3. Going to Pickup -> Confirm Picked Up
    if (order.status == OrderStatus.goingToPickup) {
      return CustomButton(
        label: isAr ? 'تم استلام الطلب من المزود 📦' : 'Confirm Picked Up 📦',
        icon: Icons.inventory_2_rounded,
        onPressed: () {
          ref.read(ordersControllerProvider.notifier).driverUpdatePipelineStatus(order.id, OrderStatus.pickedUp);
        },
      );
    }

    // 4. Picked Up -> Start Going to Customer
    if (order.status == OrderStatus.pickedUp) {
      return CustomButton(
        label: isAr ? 'الانطلاق إلى العميل للتسليم 🚀' : 'On the Way to Customer 🚀',
        icon: Icons.delivery_dining_rounded,
        onPressed: () {
          ref.read(ordersControllerProvider.notifier).driverUpdatePipelineStatus(order.id, OrderStatus.goingToCustomer);
        },
      );
    }

    // 5. Going to Customer -> Confirm Delivered & Collected or Failed
    if (order.status == OrderStatus.goingToCustomer) {
      return Row(
        children: [
          Expanded(
            flex: 3,
            child: CustomButton(
              label: isAr ? 'تم التسليم والتحصيل ✅' : 'Delivered & Collected ✅',
              icon: Icons.verified_rounded,
              onPressed: () {
                ref.read(ordersControllerProvider.notifier).driverUpdatePipelineStatus(order.id, OrderStatus.completed);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(isAr ? 'تهانينا! تم إنجاز وتسليم الطلب بنجاح' : 'Order delivered successfully!'), backgroundColor: AppColors.success),
                );
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                minimumSize: const Size(0, AppDimensions.buttonHeightMd),
              ),
              onPressed: () => _showFailedDialog(context, order: order, isAr: isAr),
              child: Text(isAr ? 'تعذر التسليم' : 'Failed', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 12)),
            ),
          ),
        ],
      );
    }

    return const SizedBox.shrink();
  }

  void _showFailedDialog(BuildContext context, {required OrderEntity order, required bool isAr}) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(isAr ? 'تعذر تسليم الطلب' : 'Delivery Failed', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800)),
        content: Text(
          isAr ? 'هل أنت متأكد من تعذر تسليم الطلب (عدم رد العميل / العنوان غير صحيح)؟' : 'Are you sure delivery could not be completed?',
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo'))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              ref.read(ordersControllerProvider.notifier).driverUpdatePipelineStatus(order.id, OrderStatus.failed);
              Navigator.of(ctx).pop();
            },
            child: Text(isAr ? 'تأكيد التعذر' : 'Confirm', style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 2: COMPLETED DELIVERIES
  // ==========================================
  Widget _buildCompletedOrdersTab(BuildContext context, List<OrderEntity> orders, bool isAr) {
    if (orders.isEmpty) {
      return EmptyView(
        title: isAr ? 'لا توجد طلبات مكتملة بعد' : 'No Completed Deliveries',
        message: isAr ? 'ستظهر هنا سجلات الطلبات بعد تسليمها بنجاح.' : 'Delivered orders history will appear here.',
        icon: Icons.history_rounded,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppDimensions.md),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final o = orders[index];
        final isSuccess = o.status == OrderStatus.completed;

        return GoldGradientCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: isSuccess ? AppColors.success.withValues(alpha: 0.15) : AppColors.error.withValues(alpha: 0.15),
                child: Icon(
                  isSuccess ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  color: isSuccess ? AppColors.success : AppColors.error,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${o.id} • ${o.customerName ?? 'عميل'}',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, fontFamily: 'Cairo'),
                    ),
                    Text(
                      '${o.deliveryAddress.area} • ${o.totalAmount.toStringAsFixed(2)} JOD',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isSuccess ? AppColors.success.withValues(alpha: 0.1) : AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isAr ? o.status.getLabelAr() : o.status.getLabelEn(),
                  style: TextStyle(
                    color: isSuccess ? AppColors.success : AppColors.error,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../orders/domain/entities/order_entity.dart';
import '../../../orders/presentation/controllers/orders_controller.dart';
import '../../../providers/domain/entities/provider_entity.dart';
import '../../../providers/presentation/controllers/providers_controller.dart';
import '../theme/admin_theme.dart';

class AdminOrdersView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminOrdersView({super.key, required this.isAr});

  @override
  ConsumerState<AdminOrdersView> createState() => _AdminOrdersViewState();
}

class _AdminOrdersViewState extends ConsumerState<AdminOrdersView> {
  String _searchQuery = '';
  String _statusFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(ordersControllerProvider);
    final providers = ref.watch(providersControllerProvider);
    final isAr = widget.isAr;

    final filteredOrders = orders.where((order) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchId = order.id.toLowerCase().contains(q);
        final matchCustomer = (order.customerName ?? '').toLowerCase().contains(q);
        final matchPhone = (order.customerPhone ?? '').contains(q);
        final matchProvider = (order.providerName ?? '').toLowerCase().contains(q);
        if (!matchId && !matchCustomer && !matchPhone && !matchProvider) return false;
      }

      if (_statusFilter == 'pending') return order.status == OrderStatus.pending;
      if (_statusFilter == 'confirmed') return order.status == OrderStatus.confirmed;
      if (_statusFilter == 'accepted') return order.status == OrderStatus.accepted;
      if (_statusFilter == 'goingToCustomer') {
        return order.status == OrderStatus.goingToCustomer ||
            order.status == OrderStatus.goingToPickup ||
            order.status == OrderStatus.pickedUp;
      }
      if (_statusFilter == 'completed') return order.status == OrderStatus.completed;
      if (_statusFilter == 'cancelled') return order.status == OrderStatus.cancelled;
      return true;
    }).toList();

    final isMobile = MediaQuery.of(context).size.width < 700;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(isMobile ? 14 : 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AdminTheme.maxContentWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AdminTheme.cardDecoration,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 600;

                    final iconBadge = Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AdminTheme.goldPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.receipt_long_rounded,
                        color: AdminTheme.goldDark,
                        size: 26,
                      ),
                    );

                    final textColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'إدارة الطلبات والتنفيذ لدى المزودين' : 'Orders & Provider Fulfillment',
                          style: TextStyle(
                            fontSize: isNarrow ? 17 : 18,
                            fontWeight: FontWeight.w900,
                            color: AdminTheme.textPrimary,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isAr
                              ? 'متابعة تدفق الطلبات، توجيهها للمزودين المعتمدين وإدارة حالات التوصيل'
                              : 'Track incoming orders, monitor provider fulfillment, and manage delivery status',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AdminTheme.textMuted,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    );

                    if (isNarrow) {
                      return Row(
                        children: [
                          iconBadge,
                          const SizedBox(width: 12),
                          Expanded(child: textColumn),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        iconBadge,
                        const SizedBox(width: 14),
                        Expanded(child: textColumn),
                      ],
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // KPI Stats
              _buildOrdersKpis(orders, isAr),

              const SizedBox(height: 20),

              // Search & Status Filters
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AdminTheme.cardDecoration,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 550;

                    final searchField = TextField(
                      decoration: InputDecoration(
                        hintText: isAr
                            ? 'بحث برقم الطلب، اسم العميل، المزود، أو الهاتف...'
                            : 'Search by Order ID, customer, provider, phone...',
                        prefixIcon: const Icon(Icons.search_rounded, size: 20),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: AdminTheme.cardBorder),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    );

                    final dropdown = DropdownButtonHideUnderline(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AdminTheme.cardBorder),
                        ),
                        child: DropdownButton<String>(
                          value: _statusFilter,
                          isExpanded: isNarrow,
                          items: [
                            DropdownMenuItem(value: 'all', child: Text(isAr ? 'جميع الطلبات' : 'All Orders')),
                            DropdownMenuItem(value: 'pending', child: Text(isAr ? 'قيد الانتظار' : 'Pending')),
                            DropdownMenuItem(value: 'confirmed', child: Text(isAr ? 'مؤكد / بانتظار المزود' : 'Confirmed')),
                            DropdownMenuItem(value: 'accepted', child: Text(isAr ? 'تم القبول من المزود' : 'Accepted by Provider')),
                            DropdownMenuItem(value: 'goingToCustomer', child: Text(isAr ? 'في طريق التوصيل' : 'Out for Delivery')),
                            DropdownMenuItem(value: 'completed', child: Text(isAr ? 'مكتمل ومسلم' : 'Completed')),
                            DropdownMenuItem(value: 'cancelled', child: Text(isAr ? 'ملغي' : 'Cancelled')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _statusFilter = val);
                          },
                        ),
                      ),
                    );

                    if (isNarrow) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          searchField,
                          const SizedBox(height: 10),
                          dropdown,
                        ],
                      );
                    }

                    return Row(
                      children: [
                        Expanded(child: searchField),
                        const SizedBox(width: 14),
                        dropdown,
                      ],
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Orders Table
              Container(
                decoration: AdminTheme.cardDecoration,
                child: filteredOrders.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(40),
                        child: Center(
                          child: Column(
                            children: [
                              const Icon(Icons.receipt_long_outlined, size: 48, color: AdminTheme.textMuted),
                              const SizedBox(height: 12),
                              Text(
                                isAr ? 'لا توجد طلبات تطابق الفلترة الحالية' : 'No orders found for selected filter',
                                style: const TextStyle(
                                  color: AdminTheme.textMuted,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            headingRowColor: WidgetStateProperty.all(const Color(0xFFF1F5F9)),
                            dataRowMinHeight: 64,
                            dataRowMaxHeight: 78,
                            columns: [
                              DataColumn(label: Text(isAr ? 'رقم الطلب' : 'Order ID', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'العميل' : 'Customer', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'عنوان التوصيل' : 'Delivery Address', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'العناصر' : 'Items', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'الإجمالي' : 'Total (JOD)', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'حالة الطلب' : 'Status', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'المزود المسؤول عن التنفيذ والتوصيل' : 'Responsible Provider', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'إدارة الطلب' : 'Manage', style: const TextStyle(fontWeight: FontWeight.bold))),
                            ],
                            rows: filteredOrders.map((order) {
                              return DataRow(
                                cells: [
                                  DataCell(
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(order.id, style: const TextStyle(fontWeight: FontWeight.w900, color: AdminTheme.goldDark, fontSize: 13)),
                                        Text(
                                          _formatDate(order.createdAt),
                                          style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  DataCell(
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(order.customerName ?? (isAr ? 'عميل' : 'Customer'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                        Text(order.customerPhone ?? '-', style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted)),
                                      ],
                                    ),
                                  ),
                                  DataCell(
                                    SizedBox(
                                      width: 140,
                                      child: Text(
                                        order.deliveryAddress.fullAddressText,
                                        style: const TextStyle(fontSize: 11),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    SizedBox(
                                      width: 140,
                                      child: Text(
                                        order.items.map((it) => '${it.quantity}x ${it.serviceNameAr}').join(', '),
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    Text(
                                      '${order.totalAmount.toStringAsFixed(2)} د.أ',
                                      style: const TextStyle(fontWeight: FontWeight.w900, color: AdminTheme.textPrimary, fontSize: 13),
                                    ),
                                  ),
                                  DataCell(
                                    _buildStatusBadge(order.status, isAr),
                                  ),
                                  DataCell(
                                    order.providerName != null
                                        ? Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFEFF6FF),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: const Color(0xFFBFDBFE)),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const Icon(Icons.storefront_rounded, size: 14, color: Color(0xFF1E40AF)),
                                                const SizedBox(width: 4),
                                                Text(
                                                  order.providerName!,
                                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                                                ),
                                              ],
                                            ),
                                          )
                                        : Text(
                                            isAr ? 'غير محدد' : 'Unassigned',
                                            style: const TextStyle(fontSize: 11, color: AdminTheme.textMuted, fontStyle: FontStyle.italic),
                                          ),
                                  ),
                                  DataCell(
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AdminTheme.goldPrimary,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      icon: const Icon(Icons.tune_rounded, size: 14),
                                      label: Text(
                                        isAr ? 'تحديث الحالة / المزود' : 'Manage',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                                      ),
                                      onPressed: () => _showOrderManageDialog(context, order, providers, isAr),
                                    ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrdersKpis(List<OrderEntity> orders, bool isAr) {
    final total = orders.length;
    final pendingOrConfirmed = orders.where((o) => o.status == OrderStatus.pending || o.status == OrderStatus.confirmed).length;
    final inFulfillment = orders.where((o) => o.status == OrderStatus.accepted || o.status == OrderStatus.goingToCustomer || o.status == OrderStatus.assigned).length;
    final completed = orders.where((o) => o.status == OrderStatus.completed).length;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;
        final childAspectRatio = constraints.maxWidth < 400 ? 1.65 : (isNarrow ? 1.9 : 2.5);
        final spacing = isNarrow ? 10.0 : 14.0;

        return GridView.count(
          crossAxisCount: isNarrow ? 2 : 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: spacing,
          mainAxisSpacing: spacing,
          childAspectRatio: childAspectRatio,
          children: [
            _kpiCard(isAr ? 'إجمالي الطلبات' : 'Total Orders', total.toString(), Icons.receipt_rounded, const Color(0xFF6366F1)),
            _kpiCard(isAr ? 'بانتظار المزود' : 'Pending Provider', pendingOrConfirmed.toString(), Icons.hourglass_top_rounded, AdminTheme.warning),
            _kpiCard(isAr ? 'قيد التنفيذ والتوصيل' : 'In Fulfillment', inFulfillment.toString(), Icons.local_shipping_rounded, const Color(0xFF0EA5E9)),
            _kpiCard(isAr ? 'مكتمل ومسلم' : 'Completed', completed.toString(), Icons.check_circle_rounded, AdminTheme.success),
          ],
        );
      },
    );
  }

  Widget _kpiCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AdminTheme.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: AdminTheme.textPrimary)),
                ),
                Text(title, style: const TextStyle(fontSize: 10.5, color: AdminTheme.textMuted, fontFamily: 'Cairo'), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(OrderStatus status, bool isAr) {
    Color bg;
    Color fg;
    String text;

    switch (status) {
      case OrderStatus.pending:
        bg = AdminTheme.warningBg;
        fg = AdminTheme.warning;
        text = isAr ? 'قيد الانتظار' : 'Pending';
        break;
      case OrderStatus.confirmed:
        bg = const Color(0xFFEFF6FF);
        fg = const Color(0xFF2563EB);
        text = isAr ? 'مؤكد' : 'Confirmed';
        break;
      case OrderStatus.accepted:
      case OrderStatus.assigned:
        bg = const Color(0xFFF3E8FF);
        fg = const Color(0xFF7C3AED);
        text = isAr ? 'تم القبول من المزود' : 'Accepted by Provider';
        break;
      case OrderStatus.goingToCustomer:
      case OrderStatus.goingToPickup:
      case OrderStatus.pickedUp:
        bg = const Color(0xFFE0F2FE);
        fg = const Color(0xFF0284C7);
        text = isAr ? 'في طريق التوصيل' : 'Out for Delivery';
        break;
      case OrderStatus.completed:
        bg = AdminTheme.successBg;
        fg = AdminTheme.success;
        text = isAr ? 'مكتمل ومسلم' : 'Completed';
        break;
      case OrderStatus.cancelled:
      case OrderStatus.failed:
      case OrderStatus.rejected:
        bg = AdminTheme.errorBg;
        fg = AdminTheme.error;
        text = isAr ? 'ملغي' : 'Cancelled';
        break;
      default:
        bg = const Color(0xFFF1F5F9);
        fg = AdminTheme.textSecondary;
        text = isAr ? status.getLabelAr() : status.getLabelEn();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  void _showOrderManageDialog(
    BuildContext context,
    OrderEntity order,
    List<ProviderEntity> providers,
    bool isAr,
  ) {
    OrderStatus selectedStatus = order.status;
    String? selectedProviderId = order.providerId;

    showDialog<void>(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AdminTheme.goldLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.receipt_rounded, color: AdminTheme.goldDark, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    isAr ? 'إدارة الطلب (${order.id})' : 'Manage Order (${order.id})',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 16),
                  ),
                ],
              ),
              content: Container(
                width: double.maxFinite,
                constraints: const BoxConstraints(maxWidth: 460),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Order Info Snapshot
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AdminTheme.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '👤 ${order.customerName ?? "عميل"} • 📞 ${order.customerPhone ?? "-"}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '📍 ${order.deliveryAddress.fullAddressText}',
                              style: const TextStyle(fontSize: 11, color: AdminTheme.textSecondary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '💰 ${order.totalAmount.toStringAsFixed(2)} JOD (${order.items.length} ${isAr ? "عنصر" : "items"})',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AdminTheme.goldDark),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Status Dropdown
                      Text(
                        isAr ? 'تحديث حالة الطلب:*' : 'Update Order Status:*',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'Cairo'),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<OrderStatus>(
                        initialValue: selectedStatus,
                        decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                        items: [
                          DropdownMenuItem(value: OrderStatus.confirmed, child: Text(isAr ? 'مؤكد (Confirmed)' : 'Confirmed')),
                          DropdownMenuItem(value: OrderStatus.accepted, child: Text(isAr ? 'تم القبول والتجهيز من المزود (Accepted)' : 'Accepted by Provider')),
                          DropdownMenuItem(value: OrderStatus.goingToCustomer, child: Text(isAr ? 'في طريق التوصيل للعميل (Out for Delivery)' : 'Out for Delivery')),
                          DropdownMenuItem(value: OrderStatus.completed, child: Text(isAr ? 'مكتمل ومسلم بنجاح (Completed)' : 'Completed / Delivered')),
                          DropdownMenuItem(value: OrderStatus.cancelled, child: Text(isAr ? 'ملغي (Cancelled)' : 'Cancelled')),
                        ],
                        onChanged: (val) {
                          if (val != null) setDialogState(() => selectedStatus = val);
                        },
                      ),
                      const SizedBox(height: 16),

                      // Provider Re-routing Dropdown
                      Text(
                        isAr ? 'المزود المسؤول عن التنفيذ والتوصيل:' : 'Assigned Fulfillment Provider:',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'Cairo'),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: selectedProviderId,
                        decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                        items: providers.map<DropdownMenuItem<String>>((p) {
                          return DropdownMenuItem<String>(
                            value: p.id,
                            child: Text('${p.nameAr} (${p.phoneNumber})', style: const TextStyle(fontSize: 12)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setDialogState(() => selectedProviderId = val);
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
                  onPressed: () => Navigator.of(dialogCtx).pop(),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AdminTheme.goldPrimary, foregroundColor: Colors.white),
                  child: Text(isAr ? 'حفظ التحديث' : 'Save Update', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                  onPressed: () {
                    final matchedProv = providers.where((p) => p.id == selectedProviderId).firstOrNull;

                    ref.read(ordersControllerProvider.notifier).adminUpdateOrderStatus(
                          orderId: order.id,
                          newStatus: selectedStatus,
                          newProviderId: matchedProv?.id,
                          newProviderName: matchedProv?.nameAr,
                          newProviderPhone: matchedProv?.phoneNumber,
                          newPickupAddress: matchedProv?.address,
                          newPickupLatitude: matchedProv?.latitude,
                          newPickupLongitude: matchedProv?.longitude,
                        );

                    Navigator.of(dialogCtx).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(isAr ? 'تم تحديث حالة الطلب والمزود بنجاح' : 'Order status and provider updated'),
                        backgroundColor: AdminTheme.success,
                      ),
                    );
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/domain/entities/service_entity.dart';
import '../../../services/presentation/controllers/services_controller.dart';
import '../theme/admin_theme.dart';

class AdminServicesView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminServicesView({super.key, required this.isAr});

  @override
  ConsumerState<AdminServicesView> createState() => _AdminServicesViewState();
}

class _AdminServicesViewState extends ConsumerState<AdminServicesView> {
  String _searchQuery = '';
  String _selectedCategory = 'all';

  @override
  Widget build(BuildContext context) {
    final servicesAsync = ref.watch(servicesProvider(null));
    final isAr = widget.isAr;

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
                        Icons.category_rounded,
                        color: AdminTheme.goldDark,
                        size: 26,
                      ),
                    );

                    final textColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'كتالوج الخدمات والمنتجات' : 'Services & Products Catalog',
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
                              ? 'إدارة قائمة الخدمات المتاحة والأسعار الرسمية المحفوظة في PostgreSQL'
                              : 'Manage active services, categories, base pricing, and units',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AdminTheme.textMuted,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    );

                    final addBtn = ElevatedButton.icon(
                      style: AdminTheme.primaryButtonStyle,
                      icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                      label: Text(
                        isAr ? 'إضافة خدمة جديدة' : 'Add New Service',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                      ),
                      onPressed: () => _showServiceDialog(context, null, isAr),
                    );

                    if (isNarrow) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              iconBadge,
                              const SizedBox(width: 12),
                              Expanded(child: textColumn),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Align(
                            alignment: isAr ? Alignment.centerRight : Alignment.centerLeft,
                            child: addBtn,
                          ),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        iconBadge,
                        const SizedBox(width: 14),
                        Expanded(child: textColumn),
                        const SizedBox(width: 14),
                        addBtn,
                      ],
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Search & Category Filters
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AdminTheme.cardDecoration,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 550;

                    final searchField = TextField(
                      decoration: InputDecoration(
                        hintText: isAr
                            ? 'بحث باسم الخدمة أو الوصف...'
                            : 'Search service name or description...',
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
                          value: _selectedCategory,
                          isExpanded: isNarrow,
                          items: [
                            DropdownMenuItem(value: 'all', child: Text(isAr ? 'جميع التصنيفات' : 'All Categories')),
                            DropdownMenuItem(value: 'cat_products', child: Text(isAr ? 'منتجات وتوصيل' : 'Products & Delivery')),
                            DropdownMenuItem(value: 'cat_home_services', child: Text(isAr ? 'خدمات صيانة منزلية' : 'Home Maintenance')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedCategory = val);
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

              // Content Canvas
              servicesAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AdminTheme.goldDark),
                  ),
                ),
                error: (err, _) => Container(
                  padding: const EdgeInsets.all(24),
                  decoration: AdminTheme.cardDecoration,
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AdminTheme.error, size: 40),
                        const SizedBox(height: 10),
                        Text(
                          isAr ? 'خطأ في تحميل الخدمات من الخادم' : 'Failed to load services from backend',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AdminTheme.error),
                        ),
                        const SizedBox(height: 6),
                        Text(err.toString(), style: const TextStyle(fontSize: 12, color: AdminTheme.textMuted)),
                        const SizedBox(height: 14),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.refresh, size: 16),
                          label: Text(isAr ? 'إعادة المحاولة' : 'Retry'),
                          onPressed: () => ref.invalidate(servicesProvider(null)),
                        ),
                      ],
                    ),
                  ),
                ),
                data: (services) {
                  final filtered = services.where((s) {
                    if (_searchQuery.isNotEmpty) {
                      final q = _searchQuery.toLowerCase();
                      final matchAr = s.nameAr.toLowerCase().contains(q);
                      final matchEn = s.nameEn.toLowerCase().contains(q);
                      if (!matchAr && !matchEn) return false;
                    }
                    if (_selectedCategory != 'all' && s.categoryId != _selectedCategory) {
                      return false;
                    }
                    return true;
                  }).toList();

                  if (filtered.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(40),
                      decoration: AdminTheme.cardDecoration,
                      child: Center(
                        child: Text(
                          isAr ? 'لا توجد خدمات مطابقة' : 'No services found',
                          style: const TextStyle(color: AdminTheme.textMuted, fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  }

                  return Container(
                    decoration: AdminTheme.cardDecoration,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          headingRowColor: WidgetStateProperty.all(const Color(0xFFF1F5F9)),
                          dataRowMinHeight: 64,
                          dataRowMaxHeight: 74,
                          columns: [
                            DataColumn(label: Text(isAr ? 'الخدمة / المنتج' : 'Service Name', style: const TextStyle(fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(isAr ? 'التصنيف' : 'Category', style: const TextStyle(fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(isAr ? 'السعر الأساسي' : 'Base Price', style: const TextStyle(fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(isAr ? 'الوحدة' : 'Unit', style: const TextStyle(fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(isAr ? 'الخيارات والأحجام' : 'Variants / Options', style: const TextStyle(fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(isAr ? 'حالة التفعيل' : 'Active Status', style: const TextStyle(fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(isAr ? 'إجراءات' : 'Actions', style: const TextStyle(fontWeight: FontWeight.bold))),
                          ],
                          rows: filtered.map((srv) {
                            return DataRow(
                              cells: [
                                DataCell(
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: AdminTheme.goldPrimary.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(Icons.build_circle_rounded, color: AdminTheme.goldDark, size: 20),
                                      ),
                                      const SizedBox(width: 12),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            isAr ? srv.nameAr : srv.nameEn,
                                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                          ),
                                          Text(
                                            'ID: ${srv.id}',
                                            style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: srv.categoryId == 'cat_products' ? const Color(0xFFEFF6FF) : const Color(0xFFFAF5FF),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      srv.categoryId == 'cat_products'
                                          ? (isAr ? 'منتجات وتوصيل' : 'Products')
                                          : (isAr ? 'صيانة وخدمات' : 'Maintenance'),
                                      style: TextStyle(
                                        color: srv.categoryId == 'cat_products' ? const Color(0xFF1E40AF) : const Color(0xFF6B21A8),
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    '${srv.basePrice.toStringAsFixed(2)} د.أ',
                                    style: const TextStyle(fontWeight: FontWeight.w900, color: AdminTheme.goldDark, fontSize: 13),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    isAr ? srv.unitAr : srv.unitEn,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ),
                                DataCell(
                                  InkWell(
                                    onTap: () => _showOptionsDialog(context, srv, isAr),
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: AdminTheme.goldPrimary.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: AdminTheme.goldPrimary.withValues(alpha: 0.4)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.tune_rounded, size: 14, color: AdminTheme.goldDark),
                                          const SizedBox(width: 6),
                                          Text(
                                            isAr ? '${srv.options.length} خيارات' : '${srv.options.length} options',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w800,
                                              color: AdminTheme.goldDark,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: srv.isActive ? AdminTheme.successBg : AdminTheme.errorBg,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      srv.isActive ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Inactive'),
                                      style: TextStyle(
                                        color: srv.isActive ? AdminTheme.success : AdminTheme.error,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.tune_rounded, color: AdminTheme.goldDark, size: 20),
                                        tooltip: isAr ? 'إدارة الخيارات والأحجام' : 'Manage Variants & Sizes',
                                        onPressed: () => _showOptionsDialog(context, srv, isAr),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.edit_note_rounded, color: AdminTheme.goldDark, size: 22),
                                        tooltip: isAr ? 'تعديل الخدمة' : 'Edit Service',
                                        onPressed: () => _showServiceDialog(context, srv, isAr),
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          srv.isActive ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                                          color: srv.isActive ? AdminTheme.success : AdminTheme.textMuted,
                                          size: 26,
                                        ),
                                        tooltip: srv.isActive ? (isAr ? 'تعطيل' : 'Deactivate') : (isAr ? 'تفعيل' : 'Activate'),
                                        onPressed: () async {
                                          try {
                                            final updated = srv.copyWith(isActive: !srv.isActive);
                                            await ref.read(serviceRepositoryProvider).updateService(updated);
                                            ref.invalidate(servicesProvider(null));
                                          } catch (e) {
                                            if (context.mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                SnackBar(content: Text('خطأ: $e'), backgroundColor: AdminTheme.error),
                                              );
                                            }
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showOptionsDialog(BuildContext context, ServiceEntity service, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                const Icon(Icons.tune_rounded, color: AdminTheme.goldDark),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    isAr ? 'خيارات وأحجام: ${service.nameAr}' : 'Options for: ${service.nameEn}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 16),
                  ),
                ),
              ],
            ),
            content: Container(
              width: double.maxFinite,
              constraints: const BoxConstraints(maxWidth: 600, maxHeight: 500),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isAr ? 'الخيارات الحالية (${service.options.length})' : 'Current Options (${service.options.length})',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo', fontSize: 13),
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AdminTheme.goldPrimary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.add, size: 16),
                        label: Text(
                          isAr ? 'إضافة خيار / حجم' : 'Add Option / Size',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                        ),
                        onPressed: () => _showAddEditOptionDialog(context, service.id, null, isAr, (newOption) {
                          ref.invalidate(servicesProvider(null));
                          Navigator.of(dialogCtx).pop();
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (service.options.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        isAr ? 'لا توجد خيارات مضافة لهذه الخدمة حتى الآن.' : 'No options added for this service yet.',
                        style: const TextStyle(color: AdminTheme.textMuted, fontFamily: 'Cairo'),
                      ),
                    )
                  else
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: service.options.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final opt = service.options[index];
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            title: Row(
                              children: [
                                Text(
                                  isAr ? opt.nameAr : opt.nameEn,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Cairo'),
                                ),
                                if (opt.size != null && opt.size!.isNotEmpty) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AdminTheme.goldPrimary.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      opt.size!,
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AdminTheme.goldDark),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            subtitle: Text(
                              '${opt.price.toStringAsFixed(2)} JOD / ${isAr ? opt.unitAr : opt.unitEn} • ${opt.isAvailable ? (isAr ? "متوفر" : "Available") : (isAr ? "غير متوفر" : "Unavailable")}',
                              style: TextStyle(
                                fontSize: 12,
                                color: opt.isAvailable ? AdminTheme.textMuted : AdminTheme.error,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit, size: 18, color: AdminTheme.goldDark),
                                  tooltip: isAr ? 'تعديل' : 'Edit',
                                  onPressed: () => _showAddEditOptionDialog(context, service.id, opt, isAr, (_) {
                                    ref.invalidate(servicesProvider(null));
                                    Navigator.of(dialogCtx).pop();
                                  }),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: AdminTheme.error),
                                  tooltip: isAr ? 'حذف' : 'Delete',
                                  onPressed: () async {
                                    try {
                                      await ref.read(serviceRepositoryProvider).deleteServiceOption(opt.id);
                                      ref.invalidate(servicesProvider(null));
                                      if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text(isAr ? 'تم حذف الخيار بنجاح' : 'Option deleted successfully'),
                                            backgroundColor: AdminTheme.success,
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text('خطأ: $e'), backgroundColor: AdminTheme.error),
                                        );
                                      }
                                    }
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
            actions: [
              TextButton(
                child: Text(isAr ? 'إغلاق' : 'Close'),
                onPressed: () => Navigator.of(dialogCtx).pop(),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAddEditOptionDialog(
    BuildContext context,
    String serviceId,
    ServiceOptionEntity? existing,
    bool isAr,
    ValueChanged<ServiceOptionEntity> onSaved,
  ) {
    final nameArCtrl = TextEditingController(text: existing?.nameAr ?? '');
    final nameEnCtrl = TextEditingController(text: existing?.nameEn ?? '');
    final sizeCtrl = TextEditingController(text: existing?.size ?? '');
    final priceCtrl = TextEditingController(text: existing?.price.toString() ?? '5.0');
    final unitArCtrl = TextEditingController(text: existing?.unitAr ?? 'وحدة');
    final unitEnCtrl = TextEditingController(text: existing?.unitEn ?? 'Unit');
    bool isAvailable = existing?.isAvailable ?? true;
    final bool isActive = existing?.isActive ?? true;

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dCtx, setDState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text(
              existing == null
                  ? (isAr ? 'إضافة خيار / حجم جديد' : 'Add New Option / Size')
                  : (isAr ? 'تعديل الخيار' : 'Edit Option'),
              style: const TextStyle(fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 16),
            ),
            content: Container(
              width: double.maxFinite,
              constraints: const BoxConstraints(maxWidth: 450),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: nameArCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الاسم (عربي)' : 'Name (AR)'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: nameEnCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الاسم (إنجليزي)' : 'Name (EN)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: sizeCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الحجم / السعة (مثال: 19 لتر)' : 'Size (e.g. 19L)'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: priceCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(labelText: isAr ? 'السعر (د.أ)' : 'Price (JOD)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: unitArCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الوحدة (عربي)' : 'Unit (AR)'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: unitEnCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الوحدة (إنجليزي)' : 'Unit (EN)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      title: Text(isAr ? 'متوفر حالياً للطلب' : 'Available for ordering', style: const TextStyle(fontSize: 13, fontFamily: 'Cairo')),
                      value: isAvailable,
                      onChanged: (val) => setDState(() => isAvailable = val),
                      activeThumbColor: AdminTheme.goldPrimary,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                child: Text(isAr ? 'إلغاء' : 'Cancel'),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
              ElevatedButton(
                style: AdminTheme.primaryButtonStyle,
                child: Text(isAr ? 'حفظ' : 'Save'),
                onPressed: () async {
                  if (nameArCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(isAr ? 'يرجى إدخال اسم الخيار' : 'Please enter option name')),
                    );
                    return;
                  }

                  final price = double.tryParse(priceCtrl.text) ?? 0.0;
                  final option = ServiceOptionEntity(
                    id: existing?.id ?? 'opt_${DateTime.now().millisecondsSinceEpoch}',
                    serviceId: serviceId,
                    nameAr: nameArCtrl.text.trim(),
                    nameEn: nameEnCtrl.text.trim().isNotEmpty ? nameEnCtrl.text.trim() : nameArCtrl.text.trim(),
                    size: sizeCtrl.text.trim().isNotEmpty ? sizeCtrl.text.trim() : null,
                    price: price,
                    unitAr: unitArCtrl.text.trim().isNotEmpty ? unitArCtrl.text.trim() : 'وحدة',
                    unitEn: unitEnCtrl.text.trim().isNotEmpty ? unitEnCtrl.text.trim() : 'Unit',
                    isAvailable: isAvailable,
                    isActive: isActive,
                  );

                  try {
                    ServiceOptionEntity saved;
                    if (existing == null) {
                      saved = await ref.read(serviceRepositoryProvider).addServiceOption(serviceId, option);
                    } else {
                      saved = await ref.read(serviceRepositoryProvider).updateServiceOption(option);
                    }
                    if (ctx.mounted) Navigator.of(ctx).pop();
                    onSaved(saved);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('خطأ: $e'), backgroundColor: AdminTheme.error),
                      );
                    }
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _showServiceDialog(BuildContext context, ServiceEntity? existing, bool isAr) {
    final nameArCtrl = TextEditingController(text: existing?.nameAr ?? '');
    final nameEnCtrl = TextEditingController(text: existing?.nameEn ?? '');
    final descArCtrl = TextEditingController(text: existing?.descriptionAr ?? '');
    final descEnCtrl = TextEditingController(text: existing?.descriptionEn ?? '');
    final priceCtrl = TextEditingController(text: existing?.basePrice.toString() ?? '10.0');
    final unitArCtrl = TextEditingController(text: existing?.unitAr ?? 'خدمة');
    String categoryId = existing?.categoryId ?? 'cat_products';
    final bool isActive = existing?.isActive ?? true;

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                const Icon(Icons.category_rounded, color: AdminTheme.goldDark),
                const SizedBox(width: 10),
                Text(
                  existing == null
                      ? (isAr ? 'إضافة خدمة جديدة' : 'Add New Service')
                      : (isAr ? 'تعديل الخدمة' : 'Edit Service'),
                  style: const TextStyle(fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 16),
                ),
              ],
            ),
            content: Container(
              width: double.maxFinite,
              constraints: const BoxConstraints(maxWidth: 500),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: nameArCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الاسم (عربي)' : 'Name (Arabic)'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: nameEnCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الاسم (إنجليزي)' : 'Name (English)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: priceCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(labelText: isAr ? 'السعر الأساسي (د.أ)' : 'Base Price (JOD)'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: unitArCtrl,
                            decoration: InputDecoration(labelText: isAr ? 'الوحدة (مثال: أسطوانة / ساعة)' : 'Unit'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: categoryId,
                      decoration: InputDecoration(labelText: isAr ? 'التصنيف' : 'Category'),
                      items: [
                        DropdownMenuItem(
                          value: 'cat_products',
                          child: Text(isAr ? 'منتجات وتوصيل (cat_products)' : 'Products (cat_products)'),
                        ),
                        DropdownMenuItem(
                          value: 'cat_home_services',
                          child: Text(isAr ? 'خدمات صيانة منزلية (cat_home_services)' : 'Home Services (cat_home_services)'),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => categoryId = val);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descArCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(labelText: isAr ? 'الوصف (عربي)' : 'Description (Arabic)'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descEnCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(labelText: isAr ? 'الوصف (إنجليزي)' : 'Description (English)'),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                child: Text(isAr ? 'إلغاء' : 'Cancel'),
                onPressed: () => Navigator.of(dialogCtx).pop(),
              ),
              ElevatedButton(
                style: AdminTheme.primaryButtonStyle,
                child: Text(isAr ? 'حفظ الخدمة' : 'Save Service'),
                onPressed: () async {
                  final price = double.tryParse(priceCtrl.text) ?? 0.0;

                  if (nameArCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(isAr ? 'يرجى إدخال اسم الخدمة' : 'Please enter service name')),
                    );
                    return;
                  }

                  final newService = ServiceEntity(
                    id: existing?.id ?? 'srv_${DateTime.now().millisecondsSinceEpoch}',
                    nameAr: nameArCtrl.text.trim(),
                    nameEn: nameEnCtrl.text.trim().isNotEmpty ? nameEnCtrl.text.trim() : nameArCtrl.text.trim(),
                    descriptionAr: descArCtrl.text.trim(),
                    descriptionEn: descEnCtrl.text.trim(),
                    categoryId: categoryId,
                    basePrice: price,
                    unitAr: unitArCtrl.text.trim().isNotEmpty ? unitArCtrl.text.trim() : 'خدمة',
                    unitEn: categoryId == 'cat_products' ? 'Unit' : 'Service',
                    type: categoryId == 'cat_products' ? ServiceType.deliveryProduct : ServiceType.homeService,
                    isActive: isActive,
                    imageUrl: existing?.imageUrl,
                  );

                  try {
                    if (existing == null) {
                      await ref.read(serviceRepositoryProvider).addService(newService);
                    } else {
                      await ref.read(serviceRepositoryProvider).updateService(newService);
                    }
                    ref.invalidate(servicesProvider(null));
                    if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isAr ? 'تم حفظ الخدمة بنجاح' : 'Service saved successfully'),
                          backgroundColor: AdminTheme.success,
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('خطأ: $e'), backgroundColor: AdminTheme.error),
                      );
                    }
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }
}


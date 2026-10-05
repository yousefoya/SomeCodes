import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/widgets/server_config_dialog.dart';
import '../../../providers/domain/entities/provider_entity.dart';
import '../../../providers/presentation/controllers/providers_controller.dart';
import '../../../services/domain/entities/service_entity.dart';
import '../../../services/presentation/controllers/services_controller.dart';
import '../theme/admin_theme.dart';

class AdminProvidersView extends ConsumerWidget {
  final bool isAr;

  const AdminProvidersView({super.key, required this.isAr});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providers = ref.watch(providersControllerProvider);
    final allServices = ref.watch(servicesProvider(null)).valueOrNull ?? [];
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
              // Header
              LayoutBuilder(
                builder: (context, constraints) {
                  final isNarrow = constraints.maxWidth < 600;

                  final textColumn = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAr ? 'مقدمو الخدمة ومراكز التوزيع' : 'Authorized Providers & Hubs',
                        style: TextStyle(
                          fontSize: isNarrow ? 18 : 20,
                          fontWeight: FontWeight.w900,
                          color: AdminTheme.textPrimary,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isAr
                            ? 'إدارة مراكز التوزيع المعتمدة وتعيين المنتجات والخدمات التي يقدمها كل مزود للتنفيذ والتوصيل'
                            : 'Manage providers, operating hours, GPS coordinates, and assigned catalog services for direct fulfillment',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AdminTheme.textSecondary,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ],
                  );

                  final addBtn = ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AdminTheme.goldPrimary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.add_business_rounded, size: 18),
                    label: Text(
                      isAr ? 'إضافة مزود جديد' : 'Add Provider',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                    onPressed: () => _showProviderDialog(context, ref, null, allServices, isAr: isAr),
                  );

                  if (isNarrow) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        textColumn,
                        const SizedBox(height: 12),
                        Align(
                          alignment: isAr ? Alignment.centerRight : Alignment.centerLeft,
                          child: addBtn,
                        ),
                      ],
                    );
                  }

                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: textColumn),
                      const SizedBox(width: 16),
                      addBtn,
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),

              if (providers.isEmpty)
                Container(
                  height: 250,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AdminTheme.cardBorder),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.storefront_outlined, size: 48, color: AdminTheme.textMuted),
                        const SizedBox(height: 12),
                        Text(
                          isAr ? 'لا يوجد مقدمو خدمة مسجلين حتى الآن' : 'No providers registered yet',
                          style: const TextStyle(fontFamily: 'Cairo', color: AdminTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                )
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount = constraints.maxWidth >= 900 ? 2 : 1;
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: providers.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        final prov = providers[index];
                        return _buildProviderCard(context, ref, prov, allServices, isAr, crossAxisCount > 1);
                      },
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProviderCard(
    BuildContext context,
    WidgetRef ref,
    ProviderEntity prov,
    List<ServiceEntity> allServices,
    bool isAr,
    bool isWide,
  ) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: prov.isActive ? AdminTheme.cardBorder : AdminTheme.error.withValues(alpha: 0.3),
        ),
        boxShadow: AdminTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Icon, Title, Status, Switch
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AdminTheme.purpleBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.storefront_rounded, color: AdminTheme.purple, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            isAr ? prov.nameAr : prov.nameEn,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              fontFamily: 'Cairo',
                              color: AdminTheme.textPrimary,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: prov.isActive ? AdminTheme.successBg : AdminTheme.errorBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            prov.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive'),
                            style: TextStyle(
                              color: prov.isActive ? AdminTheme.success : AdminTheme.error,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AdminTheme.goldLight,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded, color: AdminTheme.goldDark, size: 13),
                              const SizedBox(width: 2),
                              Text(
                                prov.rating.toStringAsFixed(1),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AdminTheme.goldDark),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '📞 ${prov.phoneNumber}',
                          style: const TextStyle(fontSize: 12, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '🕒 ${prov.operatingHours}',
                          style: const TextStyle(fontSize: 12, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
                        ),
                      ],
                    ),
                    if (prov.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        prov.description,
                        style: const TextStyle(fontSize: 11, color: AdminTheme.textMuted, fontFamily: 'Cairo'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Switch(
                value: prov.isActive,
                activeThumbColor: AdminTheme.goldPrimary,
                onChanged: (_) {
                  ref.read(providersControllerProvider.notifier).toggleProviderStatus(prov.id);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Address & Coordinates
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AdminTheme.cardBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: AdminTheme.goldDark),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${prov.address} (GPS: ${prov.latitude.toStringAsFixed(4)}, ${prov.longitude.toStringAsFixed(4)})',
                    style: const TextStyle(fontSize: 11, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Offered Products & Services Section
          Text(
            isAr ? 'المنتجات والخدمات المسندة لهذا المزود:' : 'Offered Products & Services:',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AdminTheme.textPrimary, fontFamily: 'Cairo'),
          ),
          const SizedBox(height: 6),
          if (prov.serviceIds.isEmpty)
            Text(
              isAr ? '⚠️ لم يتم ربط أي خدمات بعد' : 'No services assigned yet',
              style: const TextStyle(fontSize: 11, color: AdminTheme.warning, fontFamily: 'Cairo'),
            )
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: prov.serviceIds.map((sId) {
                final match = allServices.where((s) => s.id == sId).firstOrNull;
                final label = match != null ? (isAr ? match.nameAr : match.nameEn) : sId.replaceFirst('srv_', '');
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AdminTheme.goldLight,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AdminTheme.goldPrimary.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_outline, size: 12, color: AdminTheme.goldDark),
                      const SizedBox(width: 4),
                      Text(
                        label,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AdminTheme.goldDark, fontFamily: 'Cairo'),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),

          const Divider(height: 24),

          // Actions Row: Edit, Delete
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AdminTheme.error,
                  side: BorderSide(color: AdminTheme.error.withValues(alpha: 0.4)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.delete_outline_rounded, size: 16),
                label: Text(isAr ? 'حذف' : 'Delete', style: const TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                onPressed: () => _confirmDelete(context, ref, prov, isAr),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AdminTheme.goldPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.edit_rounded, size: 16),
                label: Text(
                  isAr ? 'تعديل البيانات والخدمات' : 'Edit Provider & Services',
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
                ),
                onPressed: () => _showProviderDialog(context, ref, prov, allServices, isAr: isAr),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, ProviderEntity prov, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isAr ? 'تأكيد حذف المزود' : 'Confirm Delete Provider',
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        content: Text(
          isAr
              ? 'هل أنت متأكد من رغبتك في حذف المزود "${prov.nameAr}" من قاعدة البيانات؟'
              : 'Are you sure you want to delete provider "${prov.nameEn}"?',
          style: const TextStyle(fontFamily: 'Cairo'),
        ),
        actions: [
          TextButton(
            child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AdminTheme.error, foregroundColor: Colors.white),
            child: Text(isAr ? 'حذف نهائي' : 'Delete', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await ref.read(providersControllerProvider.notifier).deleteProvider(prov.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(isAr ? 'تم حذف المزود بنجاح' : 'Provider deleted successfully'),
                      backgroundColor: AdminTheme.success,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل الحذف: $e'), backgroundColor: AdminTheme.error),
                  );
                }
              }
            },
          ),
        ],
      ),
    );
  }

  void _showProviderDialog(
    BuildContext context,
    WidgetRef ref,
    ProviderEntity? existing,
    List<ServiceEntity> availableServices, {
    required bool isAr,
  }) {
    final nameArCtrl = TextEditingController(text: existing?.nameAr ?? '');
    final nameEnCtrl = TextEditingController(text: existing?.nameEn ?? '');
    final phoneCtrl = TextEditingController(text: existing?.phoneNumber ?? '');
    final addressCtrl = TextEditingController(text: existing?.address ?? 'عمان');
    final descArCtrl = TextEditingController(text: existing?.descriptionAr ?? '');
    final descEnCtrl = TextEditingController(text: existing?.descriptionEn ?? '');
    final ratingCtrl = TextEditingController(text: existing != null ? existing.rating.toString() : '5.0');
    final latCtrl = TextEditingController(text: existing != null ? existing.latitude.toString() : '31.9539');
    final lngCtrl = TextEditingController(text: existing != null ? existing.longitude.toString() : '35.9106');
    final hoursCtrl = TextEditingController(text: existing?.operatingHours ?? '08:00 AM - 10:00 PM');
    bool isActive = existing?.isActive ?? true;

    final selectedServiceIds = <String>{};
    if (existing != null) {
      selectedServiceIds.addAll(existing.serviceIds);
    } else {
      // Default select delivery products
      for (final s in availableServices) {
        if (!s.isHomeService) {
          selectedServiceIds.add(s.id);
        }
      }
    }

    bool isSubmitting = false;

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AdminTheme.goldLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.storefront_rounded, color: AdminTheme.goldDark, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                existing == null
                    ? (isAr ? 'إضافة مزود / مركز توزيع جديد' : 'Add New Provider Hub')
                    : (isAr ? 'تعديل بيانات المزود والخدمات' : 'Edit Provider & Services'),
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ],
          ),
          content: Container(
            width: double.maxFinite,
            constraints: const BoxConstraints(maxWidth: 520),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: nameArCtrl,
                          decoration: InputDecoration(
                            labelText: isAr ? 'اسم المنشأة (عربي)*' : 'Provider Name (AR)*',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: nameEnCtrl,
                          decoration: InputDecoration(
                            labelText: isAr ? 'الاسم (إنجليزي)' : 'Name (EN)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: phoneCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            labelText: isAr ? 'رقم الهاتف (079XXXXXXX)*' : 'Phone Number*',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: hoursCtrl,
                          decoration: InputDecoration(
                            labelText: isAr ? 'ساعات العمل' : 'Operating Hours',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: addressCtrl,
                          decoration: InputDecoration(
                            labelText: isAr ? 'العنوان / المنطقة بالتفصيل*' : 'Address / Area*',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 1,
                        child: TextField(
                          controller: ratingCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            labelText: isAr ? 'التقييم (1-5)' : 'Rating',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: latCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            labelText: 'Latitude (GPS)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: lngCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            labelText: 'Longitude (GPS)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: descArCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: isAr ? 'نبذة عن المزود (عربي)' : 'Description (AR)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: descEnCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: isAr ? 'نبذة عن المزود (إنجليزي)' : 'Description (EN)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Service Selection Section
                  Text(
                    isAr ? 'المنتجات والخدمات التي يقدمها هذا المزود (من PostgreSQL):*' : 'Authorized Products & Services (from DB):*',
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 12, color: AdminTheme.goldDark),
                  ),
                  const SizedBox(height: 6),
                  if (availableServices.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(isAr ? 'جاري جلب الخدمات...' : 'Loading services...', style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: AdminTheme.textMuted)),
                    )
                  else
                    Container(
                      constraints: const BoxConstraints(maxHeight: 200),
                      decoration: BoxDecoration(
                        border: Border.all(color: AdminTheme.cardBorder),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: availableServices.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final s = availableServices[i];
                          final isChecked = selectedServiceIds.contains(s.id);
                          return CheckboxListTile(
                            dense: true,
                            title: Text(isAr ? s.nameAr : s.nameEn, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700)),
                            subtitle: Text('${s.basePrice.toStringAsFixed(2)} JOD  •  ${s.categoryId}', style: const TextStyle(fontSize: 10, color: AdminTheme.textSecondary)),
                            value: isChecked,
                            activeColor: AdminTheme.goldPrimary,
                            onChanged: (val) {
                              setModalState(() {
                                if (val == true) {
                                  selectedServiceIds.add(s.id);
                                } else {
                                  selectedServiceIds.remove(s.id);
                                }
                              });
                            },
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 10),

                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(isAr ? 'تفعيل المزود واستقبال الطلبات' : 'Provider Active Status', style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.bold)),
                    value: isActive,
                    activeThumbColor: AdminTheme.goldPrimary,
                    onChanged: (val) => setModalState(() => isActive = val),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
              child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AdminTheme.goldPrimary, foregroundColor: Colors.white),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final nameAr = nameArCtrl.text.trim();
                      final phone = phoneCtrl.text.trim();
                      final address = addressCtrl.text.trim();

                      if (nameAr.isEmpty || phone.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(isAr ? 'يرجى إدخال اسم المزود ورقم الهاتف' : 'Please enter provider name and phone'), backgroundColor: AdminTheme.error),
                        );
                        return;
                      }

                      setModalState(() => isSubmitting = true);

                      try {
                        final cats = <String>[];
                        for (final srvId in selectedServiceIds) {
                          final match = availableServices.where((s) => s.id == srvId).firstOrNull;
                          if (match != null && !cats.contains(match.categoryId)) {
                            cats.add(match.categoryId);
                          }
                        }

                        if (existing == null) {
                          await ref.read(providersControllerProvider.notifier).addProvider(
                            nameAr: nameAr,
                            nameEn: nameEnCtrl.text.trim().isEmpty ? nameAr : nameEnCtrl.text.trim(),
                            descriptionAr: descArCtrl.text.trim(),
                            descriptionEn: descEnCtrl.text.trim(),
                            rating: double.tryParse(ratingCtrl.text.trim()) ?? 5.0,
                            phoneNumber: phone,
                            address: address.isEmpty ? 'عمان' : address,
                            latitude: double.tryParse(latCtrl.text.trim()) ?? 31.9539,
                            longitude: double.tryParse(lngCtrl.text.trim()) ?? 35.9106,
                            serviceIds: selectedServiceIds.toList(),
                            serviceCategories: cats.isEmpty ? const ['cat_products'] : cats,
                            operatingHours: hoursCtrl.text.trim().isEmpty ? '08:00 AM - 10:00 PM' : hoursCtrl.text.trim(),
                            isAvailable: isActive,
                          );
                        } else {
                          final updated = existing.copyWith(
                            nameAr: nameAr,
                            nameEn: nameEnCtrl.text.trim().isEmpty ? nameAr : nameEnCtrl.text.trim(),
                            descriptionAr: descArCtrl.text.trim(),
                            descriptionEn: descEnCtrl.text.trim(),
                            rating: double.tryParse(ratingCtrl.text.trim()) ?? existing.rating,
                            phoneNumber: phone,
                            address: address.isEmpty ? existing.address : address,
                            latitude: double.tryParse(latCtrl.text.trim()) ?? existing.latitude,
                            longitude: double.tryParse(lngCtrl.text.trim()) ?? existing.longitude,
                            operatingHours: hoursCtrl.text.trim().isEmpty ? existing.operatingHours : hoursCtrl.text.trim(),
                            isActive: isActive,
                            serviceIds: selectedServiceIds.toList(),
                            serviceCategories: cats.isEmpty ? existing.serviceCategories : cats,
                          );
                          await ref.read(providersControllerProvider.notifier).updateProvider(updated);
                        }

                        if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                isAr
                                    ? (existing == null ? '✅ تم حفظ المزود وربط الخدمات بنجاح' : '✅ تم تحديث المزود والخدمات بنجاح')
                                    : 'Provider and services updated successfully',
                              ),
                              backgroundColor: AdminTheme.success,
                            ),
                          );
                        }
                      } catch (e) {
                        setModalState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isAr ? 'فشل الحفظ: $e' : 'Error saving provider: $e'),
                              backgroundColor: AdminTheme.error,
                              action: SnackBarAction(
                                label: isAr ? 'ضبط الخادم' : 'Server Settings',
                                textColor: Colors.white,
                                onPressed: () => ServerConfigDialog.show(context, isAr: isAr),
                              ),
                              duration: const Duration(seconds: 6),
                            ),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(
                      existing == null ? (isAr ? 'إضافة' : 'Add') : (isAr ? 'حفظ التعديلات' : 'Save Changes'),
                      style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w800),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

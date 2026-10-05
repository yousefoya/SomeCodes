import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../coupons/domain/entities/coupon_entity.dart';
import '../../../coupons/presentation/controllers/coupons_controller.dart';
import '../../../offers/domain/entities/offer_entity.dart';
import '../../../offers/presentation/controllers/offers_controller.dart';
import '../theme/admin_theme.dart';

class AdminCouponsView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminCouponsView({super.key, required this.isAr});

  @override
  ConsumerState<AdminCouponsView> createState() => _AdminCouponsViewState();
}

class _AdminCouponsViewState extends ConsumerState<AdminCouponsView> with SingleTickerProviderStateMixin {
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
    final coupons = ref.watch(couponsControllerProvider);
    final offers = ref.watch(offersControllerProvider);
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
                        Icons.local_offer_rounded,
                        color: AdminTheme.goldDark,
                        size: 26,
                      ),
                    );

                    final textColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'كوبونات الخصم والحملات الترويجية' : 'Coupons & Promotional Campaigns',
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
                              ? 'إدارة أكواد الخصم والبانرات الإعلانية الظاهرة للعملاء في التطبيق'
                              : 'Manage checkout discount codes, limits, and customer promo banners',
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
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: Text(
                        _tabController.index == 0
                            ? (isAr ? 'إضافة كوبون' : 'Add Coupon')
                            : (isAr ? 'إضافة عرض' : 'Add Promo Offer'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                      ),
                      onPressed: () {
                        if (_tabController.index == 0) {
                          _showAddCouponDialog(context, isAr);
                        } else {
                          _showAddOfferDialog(context, isAr);
                        }
                      },
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

              // Sub Tabs (Coupons vs Promo Banners)
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AdminTheme.cardBorder),
                ),
                child: TabBar(
                  controller: _tabController,
                  onTap: (_) => setState(() {}),
                  labelColor: AdminTheme.goldDark,
                  unselectedLabelColor: AdminTheme.textMuted,
                  indicatorColor: AdminTheme.goldPrimary,
                  indicatorWeight: 3,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo', fontSize: 14),
                  tabs: [
                    Tab(
                      icon: const Icon(Icons.confirmation_number_outlined, size: 18),
                      text: isAr ? 'أكواد الكوبونات (${coupons.length})' : 'Coupon Codes (${coupons.length})',
                    ),
                    Tab(
                      icon: const Icon(Icons.campaign_outlined, size: 18),
                      text: isAr ? 'العروض والبانرات (${offers.length})' : 'Promo Banners (${offers.length})',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Content based on tab
              _tabController.index == 0
                  ? _buildCouponsTable(coupons, isAr)
                  : _buildOffersTable(offers, isAr),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCouponsTable(List<CouponEntity> coupons, bool isAr) {
    if (coupons.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: AdminTheme.cardDecoration,
        child: Center(
          child: Text(
            isAr ? 'لا توجد كوبونات مسجلة' : 'No coupons found',
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
            dataRowMinHeight: 60,
            dataRowMaxHeight: 70,
            columns: [
              DataColumn(label: Text(isAr ? 'كود الكوبون' : 'Coupon Code', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'النوع' : 'Type', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'قيمة الخصم' : 'Discount Value', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'الحد الأدنى للطلب' : 'Min Order', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'مرات الاستخدام' : 'Usage / Limit', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'الحالة' : 'Status', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'إجراءات' : 'Actions', style: const TextStyle(fontWeight: FontWeight.bold))),
            ],
            rows: coupons.map((cpn) {
              return DataRow(
                cells: [
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AdminTheme.goldPrimary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AdminTheme.goldDark.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        cpn.code,
                        style: const TextStyle(fontWeight: FontWeight.w900, color: AdminTheme.goldDark, letterSpacing: 0.8),
                      ),
                    ),
                  ),
                  DataCell(
                    Text(
                      cpn.type == CouponType.percentage
                          ? (isAr ? 'نسبة مئوية (%)' : 'Percentage (%)')
                          : (isAr ? 'مبلغ ثابت (د.أ)' : 'Fixed Amount (JOD)'),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  DataCell(
                    Text(
                      cpn.type == CouponType.percentage ? '${cpn.value.toInt()}%' : '${cpn.value.toStringAsFixed(2)} د.أ',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                  DataCell(
                    Text(
                      cpn.minOrderValue > 0 ? '${cpn.minOrderValue.toStringAsFixed(2)} د.أ' : (isAr ? 'بدون حد' : 'No min'),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  DataCell(
                    Text(
                      '${cpn.usageCount} / ${cpn.usageLimit}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: cpn.isActive ? AdminTheme.successBg : AdminTheme.errorBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        cpn.isActive ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Inactive'),
                        style: TextStyle(
                          color: cpn.isActive ? AdminTheme.success : AdminTheme.error,
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
                          icon: Icon(
                            cpn.isActive ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                            color: cpn.isActive ? AdminTheme.success : AdminTheme.textMuted,
                            size: 26,
                          ),
                          onPressed: () async {
                            final token = await ref.read(authLocalDataSourceProvider).getAccessToken();
                            ref.read(couponsControllerProvider.notifier).toggleCouponStatus(cpn.id, token: token);
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AdminTheme.error, size: 20),
                          onPressed: () async {
                            final token = await ref.read(authLocalDataSourceProvider).getAccessToken();
                            ref.read(couponsControllerProvider.notifier).deleteCoupon(cpn.id, token: token);
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
  }

  Widget _buildOffersTable(List<OfferEntity> offers, bool isAr) {
    if (offers.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: AdminTheme.cardDecoration,
        child: Center(
          child: Text(
            isAr ? 'لا توجد عروض أو بانرات ترويجية' : 'No promo offers found',
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
              DataColumn(label: Text(isAr ? 'عنوان العرض' : 'Offer Title', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'نسبة الخصم' : 'Discount', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'الكود المرتبط' : 'Promo Code', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'تاريخ البداية والنهاية' : 'Validity Range', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'الحالة' : 'Status', style: const TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text(isAr ? 'إجراءات' : 'Actions', style: const TextStyle(fontWeight: FontWeight.bold))),
            ],
            rows: offers.map((offer) {
              return DataRow(
                cells: [
                  DataCell(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(isAr ? offer.titleAr : offer.titleEn, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        Text(
                          isAr ? offer.descriptionAr : offer.descriptionEn,
                          style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  DataCell(
                    Text('${offer.discountPercentage.toInt()}%', style: const TextStyle(fontWeight: FontWeight.w900, color: AdminTheme.goldDark)),
                  ),
                  DataCell(
                    Text(offer.promoCode ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                  DataCell(
                    Text(
                      '${offer.startDate.year}-${offer.startDate.month}-${offer.startDate.day} → ${offer.endDate.year}-${offer.endDate.month}-${offer.endDate.day}',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: offer.isActive ? AdminTheme.successBg : AdminTheme.errorBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        offer.isActive ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Inactive'),
                        style: TextStyle(
                          color: offer.isActive ? AdminTheme.success : AdminTheme.error,
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
                          icon: Icon(
                            offer.isActive ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                            color: offer.isActive ? AdminTheme.success : AdminTheme.textMuted,
                            size: 26,
                          ),
                          onPressed: () {
                            ref.read(offersControllerProvider.notifier).toggleOfferStatus(offer.id);
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AdminTheme.error, size: 20),
                          onPressed: () {
                            ref.read(offersControllerProvider.notifier).deleteOffer(offer.id);
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
  }

  void _showAddCouponDialog(BuildContext context, bool isAr) {
    final codeCtrl = TextEditingController();
    final valueCtrl = TextEditingController(text: '15');
    final minOrderCtrl = TextEditingController(text: '0');
    final limitCtrl = TextEditingController(text: '500');
    CouponType type = CouponType.percentage;

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text(isAr ? 'إضافة كود كوبون جديد' : 'Add New Coupon', style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
            content: Container(
              width: double.maxFinite,
              constraints: const BoxConstraints(maxWidth: 480),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: codeCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(labelText: isAr ? 'كود الكوبون (مثال: SAVE20)' : 'Coupon Code (e.g. SAVE20)'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<CouponType>(
                      initialValue: type,
                      decoration: InputDecoration(labelText: isAr ? 'نوع الخصم' : 'Discount Type'),
                      items: [
                        DropdownMenuItem(value: CouponType.percentage, child: Text(isAr ? 'نسبة مئوية (%)' : 'Percentage (%)')),
                        DropdownMenuItem(value: CouponType.fixedAmount, child: Text(isAr ? 'مبلغ ثابت (د.أ)' : 'Fixed Amount (JOD)')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => type = val);
                      },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: valueCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(labelText: isAr ? 'قيمة الخصم' : 'Discount Value'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: minOrderCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(labelText: isAr ? 'الحد الأدنى للطلب (د.أ)' : 'Min Order (JOD)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: limitCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: isAr ? 'الحد الأقصى لمرات الاستخدام' : 'Max Usage Limit'),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(child: Text(isAr ? 'إلغاء' : 'Cancel'), onPressed: () => Navigator.of(dialogCtx).pop()),
              ElevatedButton(
                style: AdminTheme.primaryButtonStyle,
                child: Text(isAr ? 'حفظ الكوبون' : 'Save Coupon'),
                onPressed: () async {
                  if (codeCtrl.text.trim().isEmpty) return;
                  final token = await ref.read(authLocalDataSourceProvider).getAccessToken();
                  ref.read(couponsControllerProvider.notifier).addCoupon(
                        code: codeCtrl.text.trim(),
                        type: type,
                        value: double.tryParse(valueCtrl.text) ?? 10.0,
                        minOrderValue: double.tryParse(minOrderCtrl.text) ?? 0.0,
                        usageLimit: int.tryParse(limitCtrl.text) ?? 1000,
                        token: token,
                      );
                  if (dialogCtx.mounted) {
                    Navigator.of(dialogCtx).pop();
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAddOfferDialog(BuildContext context, bool isAr) {
    final titleArCtrl = TextEditingController();
    final titleEnCtrl = TextEditingController();
    final descArCtrl = TextEditingController();
    final descEnCtrl = TextEditingController();
    final discountCtrl = TextEditingController(text: '15');
    final promoCodeCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(isAr ? 'إضافة عرض ترويجي وبانر' : 'Add Promo Offer & Banner', style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
        content: Container(
          width: double.maxFinite,
          constraints: const BoxConstraints(maxWidth: 480),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleArCtrl,
                  decoration: InputDecoration(labelText: isAr ? 'عنوان العرض (عربي)' : 'Offer Title (Arabic)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleEnCtrl,
                  decoration: InputDecoration(labelText: isAr ? 'عنوان العرض (إنجليزي)' : 'Offer Title (English)'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: discountCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: isAr ? 'نسبة الخصم (%)' : 'Discount (%)'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: promoCodeCtrl,
                        decoration: InputDecoration(labelText: isAr ? 'الكود المرتبط (اختياري)' : 'Promo Code (Optional)'),
                      ),
                    ),
                  ],
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
          TextButton(child: Text(isAr ? 'إلغاء' : 'Cancel'), onPressed: () => Navigator.of(dialogCtx).pop()),
          ElevatedButton(
            style: AdminTheme.primaryButtonStyle,
            child: Text(isAr ? 'حفظ العرض' : 'Save Offer'),
            onPressed: () {
              if (titleArCtrl.text.trim().isEmpty) return;
              ref.read(offersControllerProvider.notifier).addOffer(
                    titleAr: titleArCtrl.text.trim(),
                    titleEn: titleEnCtrl.text.trim().isNotEmpty ? titleEnCtrl.text.trim() : titleArCtrl.text.trim(),
                    descriptionAr: descArCtrl.text.trim(),
                    descriptionEn: descEnCtrl.text.trim(),
                    discountPercentage: double.tryParse(discountCtrl.text) ?? 10.0,
                    promoCode: promoCodeCtrl.text.trim().isNotEmpty ? promoCodeCtrl.text.trim() : null,
                    startDate: DateTime.now(),
                    endDate: DateTime.now().add(const Duration(days: 30)),
                  );
              Navigator.of(dialogCtx).pop();
            },
          ),
        ],
      ),
    );
  }
}

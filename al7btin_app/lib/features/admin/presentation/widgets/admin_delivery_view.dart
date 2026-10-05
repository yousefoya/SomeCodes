import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../delivery/domain/entities/delivery_employee_entity.dart';
import '../../../delivery/presentation/controllers/delivery_controller.dart';
import '../../../providers/presentation/controllers/providers_controller.dart';
import '../theme/admin_theme.dart';

class AdminDeliveryView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminDeliveryView({super.key, required this.isAr});

  @override
  ConsumerState<AdminDeliveryView> createState() => _AdminDeliveryViewState();
}

class _AdminDeliveryViewState extends ConsumerState<AdminDeliveryView> {
  String _searchQuery = '';
  String _statusFilter = 'all'; // all, online, offline, inactive

  @override
  Widget build(BuildContext context) {
    final drivers = ref.watch(deliveryEmployeesControllerProvider);
    final isAr = widget.isAr;

    final filteredDrivers = drivers.where((d) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchName = d.name.toLowerCase().contains(q);
        final matchPhone = d.phoneNumber.contains(q);
        final matchVehicle = d.vehiclePlateNumber.toLowerCase().contains(q) ||
            d.vehicleType.toLowerCase().contains(q);
        if (!matchName && !matchPhone && !matchVehicle) return false;
      }

      if (_statusFilter == 'online') return d.isOnline && d.isActive;
      if (_statusFilter == 'offline') return !d.isOnline && d.isActive;
      if (_statusFilter == 'inactive') return !d.isActive;
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
                        Icons.delivery_dining_rounded,
                        color: AdminTheme.goldDark,
                        size: 26,
                      ),
                    );

                    final textColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'أسطول كادر التوصيل والمناديب' : 'Delivery Staff & Fleet Management',
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
                              ? 'إدارة المناديب المرتبطين بالمزودين والتحقق من صلاحيات تقديم الخدمات'
                              : 'Manage provider-linked drivers and service delivery capabilities',
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
                      icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
                      label: Text(
                        isAr ? 'إضافة مندوب جديد' : 'Add New Driver',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                      ),
                      onPressed: () => _showAddDriverDialog(context, isAr),
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

              // KPI Stats
              _buildFleetKpis(drivers, isAr),

              const SizedBox(height: 20),

              // Filters & Search Bar
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AdminTheme.cardDecoration,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 550;

                    final searchField = TextField(
                      decoration: InputDecoration(
                        hintText: isAr
                            ? 'بحث بالاسم، رقم الهاتف، نوع المركبة، اللوحة...'
                            : 'Search by name, phone, vehicle plate...',
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
                            DropdownMenuItem(
                              value: 'all',
                              child: Text(isAr ? 'جميع الحالات' : 'All Statuses'),
                            ),
                            DropdownMenuItem(
                              value: 'online',
                              child: Text(isAr ? 'متصل ومتاح الآن' : 'Online & Available'),
                            ),
                            DropdownMenuItem(
                              value: 'offline',
                              child: Text(isAr ? 'غير متصل' : 'Offline'),
                            ),
                            DropdownMenuItem(
                              value: 'inactive',
                              child: Text(isAr ? 'حساب معطل' : 'Deactivated'),
                            ),
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

              // Drivers Table / Cards
              Container(
                decoration: AdminTheme.cardDecoration,
                child: filteredDrivers.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(40),
                        child: Center(
                          child: Column(
                            children: [
                              const Icon(Icons.delivery_dining_outlined, size: 48, color: AdminTheme.textMuted),
                              const SizedBox(height: 12),
                              Text(
                                isAr ? 'لا يوجد مناديب مطابقين لمعايير البحث' : 'No drivers found matching criteria',
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
                            dataRowMaxHeight: 74,
                            columns: [
                              DataColumn(label: Text(isAr ? 'المندوب' : 'Driver Name', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'الهاتف' : 'Phone', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'المركبة واللوحة' : 'Vehicle & Plate', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'المزود التابع له' : 'Provider Hub', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'الخدمات المصرح بها' : 'Service Capabilities', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'حالة التواجد' : 'Online State', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'حالة الحساب' : 'Account Status', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataColumn(label: Text(isAr ? 'إجراءات' : 'Actions', style: const TextStyle(fontWeight: FontWeight.bold))),
                            ],
                            rows: filteredDrivers.map((driver) {
                              return DataRow(
                                cells: [
                                  DataCell(
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 16,
                                          backgroundColor: AdminTheme.goldPrimary.withValues(alpha: 0.2),
                                          child: Text(
                                            driver.name.isNotEmpty ? driver.name[0] : 'D',
                                            style: const TextStyle(fontWeight: FontWeight.bold, color: AdminTheme.goldDark),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(driver.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                            Text(
                                              'ID: ${driver.id}',
                                              style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  DataCell(Text(driver.phoneNumber, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                  DataCell(
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(driver.vehicleType, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        Text(driver.vehiclePlateNumber, style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted)),
                                      ],
                                    ),
                                  ),
                                  DataCell(
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEFF6FF),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFBFDBFE)),
                                      ),
                                      child: Text(
                                        driver.providerName ?? driver.providerId ?? (isAr ? 'أسطول مباشر' : 'Direct Fleet'),
                                        style: const TextStyle(color: Color(0xFF1E40AF), fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    Wrap(
                                      spacing: 4,
                                      runSpacing: 4,
                                      children: driver.serviceCapabilities.take(3).map((s) {
                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            _formatServiceName(s, isAr),
                                            style: const TextStyle(fontSize: 10, color: Color(0xFF334155), fontWeight: FontWeight.w600),
                                          ),
                                        );
                                      }).toList()
                                        ..addAll(
                                          driver.serviceCapabilities.length > 3
                                              ? [
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                                    child: Text(
                                                      '+${driver.serviceCapabilities.length - 3}',
                                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AdminTheme.textMuted),
                                                    ),
                                                  )
                                                ]
                                              : [],
                                        ),
                                    ),
                                  ),
                                  DataCell(
                                    Switch(
                                      value: driver.isOnline,
                                      activeThumbColor: AdminTheme.success,
                                      onChanged: (val) {
                                        ref.read(deliveryEmployeesControllerProvider.notifier).toggleOnlineStatus(driver.id);
                                      },
                                    ),
                                  ),
                                  DataCell(
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: driver.isActive ? AdminTheme.successBg : AdminTheme.errorBg,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        driver.isActive ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Inactive'),
                                        style: TextStyle(
                                          color: driver.isActive ? AdminTheme.success : AdminTheme.error,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    IconButton(
                                      icon: Icon(
                                        driver.isActive ? Icons.block_rounded : Icons.check_circle_rounded,
                                        color: driver.isActive ? AdminTheme.error : AdminTheme.success,
                                        size: 20,
                                      ),
                                      tooltip: driver.isActive
                                          ? (isAr ? 'تعطيل الحساب' : 'Deactivate')
                                          : (isAr ? 'تفعيل الحساب' : 'Activate'),
                                      onPressed: () {
                                        ref.read(deliveryEmployeesControllerProvider.notifier).toggleEmployeeStatus(driver.id);
                                      },
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

  Widget _buildFleetKpis(List<DeliveryEmployeeEntity> drivers, bool isAr) {
    final total = drivers.length;
    final online = drivers.where((d) => d.isOnline && d.isActive).length;
    final active = drivers.where((d) => d.isActive).length;
    final inactive = drivers.where((d) => !d.isActive).length;

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
            _kpiCard(isAr ? 'إجمالي الأسطول' : 'Total Fleet', total.toString(), Icons.groups_rounded, const Color(0xFF6366F1)),
            _kpiCard(isAr ? 'المتاحون الآن' : 'Active & Online', online.toString(), Icons.wifi_tethering_rounded, AdminTheme.success),
            _kpiCard(isAr ? 'حسابات نشطة' : 'Active Accounts', active.toString(), Icons.verified_user_rounded, const Color(0xFF0EA5E9)),
            _kpiCard(isAr ? 'حسابات معطلة' : 'Deactivated', inactive.toString(), Icons.person_off_rounded, AdminTheme.error),
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

  String _formatServiceName(String id, bool isAr) {
    switch (id) {
      case 'srv_gas_cylinder':
        return isAr ? 'أسطوانة غاز' : 'Gas Cylinder';
      case 'srv_pure_water':
        return isAr ? 'مياه نقية' : 'Pure Water';
      case 'srv_heating_diesel':
        return isAr ? 'ديزل تدفئة' : 'Heating Diesel';
      case 'srv_electrical':
        return isAr ? 'صيانة كهرباء' : 'Electrical';
      case 'srv_plumbing':
        return isAr ? 'صيانة سباكة' : 'Plumbing';
      case 'srv_ac_cooling':
        return isAr ? 'صيانة مكيفات' : 'AC & Cooling';
      default:
        return id.replaceFirst('srv_', '');
    }
  }

  void _showAddDriverDialog(BuildContext context, bool isAr) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final vehicleTypeCtrl = TextEditingController(text: 'بيك آب غاز مجهز');
    final vehiclePlateCtrl = TextEditingController();

    final providers = ref.read(providersControllerProvider);
    String? selectedProviderId = providers.isNotEmpty ? providers.first.id : null;
    final selectedServices = <String>{'srv_gas_cylinder', 'srv_pure_water'};

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final selectedProvider = providers.firstWhere(
            (p) => p.id == selectedProviderId,
            orElse: () => providers.first,
          );
          final availableServices = selectedProvider.serviceIds;

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                const Icon(Icons.person_add_rounded, color: AdminTheme.goldDark),
                const SizedBox(width: 10),
                Text(
                  isAr ? 'إضافة مندوب توصيل جديد' : 'Add New Delivery Staff',
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: InputDecoration(
                        labelText: isAr ? 'اسم المندوب' : 'Driver Name',
                        prefixIcon: const Icon(Icons.person_outline),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: isAr ? 'رقم الهاتف (الأردن 07...)' : 'Phone Number (Jordan)',
                        prefixIcon: const Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: vehicleTypeCtrl,
                      decoration: InputDecoration(
                        labelText: isAr ? 'نوع المركبة والتجهيز' : 'Vehicle Type',
                        prefixIcon: const Icon(Icons.local_shipping_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: vehiclePlateCtrl,
                      decoration: InputDecoration(
                        labelText: isAr ? 'رقم اللوحة' : 'Vehicle Plate Number',
                        prefixIcon: const Icon(Icons.pin_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Provider Dropdown
                    Text(
                      isAr ? 'المزود / الفرع التابع له' : 'Associated Provider Hub',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Cairo'),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: selectedProviderId,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: providers.map((p) {
                        return DropdownMenuItem(
                          value: p.id,
                          child: Text('${p.nameAr} (${p.id})', style: const TextStyle(fontSize: 13)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setDialogState(() {
                          selectedProviderId = val;
                          selectedServices.clear();
                        });
                      },
                    ),

                    const SizedBox(height: 16),

                    // Capabilities Checkboxes (based on Provider)
                    Text(
                      isAr ? 'الخدمات المصرح للمندوب تقديمها (حسب مزوده):' : 'Authorized Services (from Provider):',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Cairo'),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      children: availableServices.map((srvId) {
                        final isChecked = selectedServices.contains(srvId);
                        return FilterChip(
                          label: Text(_formatServiceName(srvId, isAr)),
                          selected: isChecked,
                          selectedColor: AdminTheme.goldPrimary.withValues(alpha: 0.3),
                          onSelected: (selected) {
                            setDialogState(() {
                              if (selected) {
                                selectedServices.add(srvId);
                              } else {
                                selectedServices.remove(srvId);
                              }
                            });
                          },
                        );
                      }).toList(),
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
                child: Text(isAr ? 'حفظ وإضافة' : 'Save Driver'),
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty || phoneCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(isAr ? 'يرجى تعبئة الاسم ورقم الهاتف' : 'Please fill name and phone')),
                    );
                    return;
                  }
                  if (selectedProviderId == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(isAr ? 'يرجى اختيار المزود' : 'Please select a provider')),
                    );
                    return;
                  }

                  try {
                    await ref.read(deliveryEmployeesControllerProvider.notifier).addDeliveryEmployee(
                          name: nameCtrl.text.trim(),
                          phoneNumber: phoneCtrl.text.trim(),
                          vehicleType: vehicleTypeCtrl.text.trim(),
                          vehiclePlateNumber: vehiclePlateCtrl.text.trim(),
                          providerId: selectedProviderId!,
                          serviceIds: selectedServices.toList(),
                        );
                    if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isAr ? 'تم إضافة المندوب بنجاح' : 'Driver added successfully'),
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

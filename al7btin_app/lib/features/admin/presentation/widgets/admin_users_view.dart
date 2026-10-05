import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../controllers/admin_users_controller.dart';
import '../theme/admin_theme.dart';
import 'admin_user_dialogs.dart';

class AdminUsersView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminUsersView({super.key, required this.isAr});

  @override
  ConsumerState<AdminUsersView> createState() => _AdminUsersViewState();
}

class _AdminUsersViewState extends ConsumerState<AdminUsersView> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminUsersControllerProvider);
    final controller = ref.read(adminUsersControllerProvider.notifier);

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
              // Header & Action Bar
              _buildHeader(context),
              const SizedBox(height: 20),

              // Filter & Search Toolbar
              _buildToolbar(controller, state),
              const SizedBox(height: 16),

              // Data Table Container
              _buildTableCard(context, state, controller),
              const SizedBox(height: 16),

              // Pagination Footer
              _buildPaginationFooter(state, controller),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 600;

        final textColumn = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.isAr ? 'إدارة المستخدمين' : 'User Accounts Management',
              style: TextStyle(
                fontSize: isNarrow ? 18 : 20,
                fontWeight: FontWeight.w900,
                color: AdminTheme.textPrimary,
                fontFamily: 'Cairo',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.isAr
                  ? 'إدارة جميع الحسابات المسجلة في منصة بتنحل وتعديل الصلاحيات والأدوار'
                  : 'Manage registered user accounts, roles, permissions, and suspension states',
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
          icon: const Icon(Icons.person_add_rounded, size: 18),
          label: Text(
            widget.isAr ? 'إضافة مستخدم' : 'Add User',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 13),
          ),
          onPressed: () => AdminUserAddDialog.show(context, isAr: widget.isAr),
        );

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              textColumn,
              const SizedBox(height: 12),
              Align(
                alignment: widget.isAr ? Alignment.centerRight : Alignment.centerLeft,
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
    );
  }

  Widget _buildToolbar(AdminUsersController controller, AdminUsersState state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AdminTheme.cardBorder),
        boxShadow: AdminTheme.cardShadow,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 800;

          final searchField = TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: widget.isAr ? 'بحث بالاسم، رقم الهاتف، أو البريد الإلكتروني...' : 'Search name, phone, email...',
              hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 12),
              prefixIcon: const Icon(Icons.search, size: 20, color: AdminTheme.textMuted),
              suffixIcon: _searchCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 16),
                      onPressed: () {
                        _searchCtrl.clear();
                        controller.setSearch('');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AdminTheme.cardBorder),
              ),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
            ),
            onSubmitted: (val) => controller.setSearch(val.trim()),
          );

          final roleDropdown = DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: state.roleFilter,
            decoration: InputDecoration(
              labelText: widget.isAr ? 'تصفية حسب الدور' : 'Filter Role',
              labelStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 11),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            items: [
              DropdownMenuItem(value: 'all', child: Text(widget.isAr ? 'جميع الأدوار (All)' : 'All Roles')),
              DropdownMenuItem(value: 'customer', child: Text(widget.isAr ? 'العملاء (Customers)' : 'Customers')),
              DropdownMenuItem(value: 'admin', child: Text(widget.isAr ? 'المدراء (Admins)' : 'Admins')),
              DropdownMenuItem(value: 'provider', child: Text(widget.isAr ? 'المزودين (Providers)' : 'Providers')),
              DropdownMenuItem(value: 'delivery', child: Text(widget.isAr ? 'المناديب (Delivery)' : 'Delivery Partners')),
            ],
            onChanged: (val) {
              if (val != null) controller.setRoleFilter(val);
            },
          );

          final statusDropdown = DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: state.statusFilter,
            decoration: InputDecoration(
              labelText: widget.isAr ? 'تصفية حسب الحالة' : 'Filter Status',
              labelStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 11),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            items: [
              DropdownMenuItem(value: 'all', child: Text(widget.isAr ? 'جميع الحالات' : 'All Status')),
              DropdownMenuItem(value: 'active', child: Text(widget.isAr ? 'نشط فقط' : 'Active Only')),
              DropdownMenuItem(value: 'suspended', child: Text(widget.isAr ? 'موقوف فقط' : 'Suspended Only')),
            ],
            onChanged: (val) {
              if (val != null) controller.setStatusFilter(val);
            },
          );

          final refreshBtn = IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AdminTheme.textSecondary),
            tooltip: widget.isAr ? 'تحديث القائمة' : 'Refresh',
            onPressed: () => controller.loadUsers(),
          );

          if (isWide) {
            return Row(
              children: [
                Expanded(flex: 3, child: searchField),
                const SizedBox(width: 12),
                Expanded(flex: 2, child: roleDropdown),
                const SizedBox(width: 12),
                Expanded(flex: 2, child: statusDropdown),
                const SizedBox(width: 8),
                refreshBtn,
              ],
            );
          } else {
            return Column(
              children: [
                searchField,
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: roleDropdown),
                    const SizedBox(width: 8),
                    Expanded(child: statusDropdown),
                    const SizedBox(width: 4),
                    refreshBtn,
                  ],
                ),
              ],
            );
          }
        },
      ),
    );
  }

  Widget _buildTableCard(BuildContext context, AdminUsersState state, AdminUsersController controller) {
    if (state.isLoading) {
      return Container(
        height: 300,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AdminTheme.cardBorder),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: AdminTheme.goldPrimary),
        ),
      );
    }

    if (state.errorMessage != null) {
      return Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AdminTheme.cardBorder),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AdminTheme.error, size: 40),
              const SizedBox(height: 12),
              Text(
                state.errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontFamily: 'Cairo', color: AdminTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AdminTheme.goldPrimary),
                onPressed: () => controller.loadUsers(),
                child: Text(widget.isAr ? 'إعادة المحاولة' : 'Retry', style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
              ),
            ],
          ),
        ),
      );
    }

    if (state.users.isEmpty) {
      return Container(
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
              const Icon(Icons.people_outline_rounded, color: AdminTheme.textMuted, size: 48),
              const SizedBox(height: 12),
              Text(
                widget.isAr ? 'لا يوجد مستخدمين مطابقين لمعايير البحث' : 'No matching users found in database',
                style: const TextStyle(fontFamily: 'Cairo', color: AdminTheme.textMuted, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    final isMobile = MediaQuery.of(context).size.width < 700;

    if (isMobile) {
      return _buildMobileUserList(context, state, controller);
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AdminTheme.cardBorder),
        boxShadow: AdminTheme.cardShadow,
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 900),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
            horizontalMargin: 20,
            columnSpacing: 24,
            columns: [
              DataColumn(label: Text('#', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'الاسم' : 'Name', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'رقم الهاتف والبريد' : 'Contact', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'الدور' : 'Role', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'الحالة' : 'Status', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'الرصيد / النقاط' : 'Wallet & Points', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'تاريخ التسجيل' : 'Registered', style: _tableHeaderStyle())),
              DataColumn(label: Text(widget.isAr ? 'الإجراءات' : 'Actions', style: _tableHeaderStyle())),
            ],
            rows: List.generate(state.users.length, (index) {
              final u = state.users[index];
              final rowNum = ((state.page - 1) * state.limit) + index + 1;

              return DataRow(
                cells: [
                  DataCell(Text('$rowNum', style: const TextStyle(color: AdminTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold))),
                  DataCell(
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: u.isSuspended ? AdminTheme.errorBg : AdminTheme.goldLight,
                          child: Icon(
                            u.isSuspended ? Icons.block_rounded : Icons.person_rounded,
                            size: 14,
                            color: u.isSuspended ? AdminTheme.error : AdminTheme.goldDark,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          u.name ?? (widget.isAr ? 'مستخدم بدون اسم' : 'Unnamed User'),
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, fontFamily: 'Cairo'),
                        ),
                      ],
                    ),
                  ),
                  DataCell(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('📱 ${u.phoneNumber}', style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
                        if (u.email != null && u.email!.isNotEmpty)
                          Text('✉️ ${u.email}', style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted)),
                      ],
                    ),
                  ),
                  DataCell(_buildRoleBadge(u.role)),
                  DataCell(_buildStatusBadge(u.isSuspended)),
                  DataCell(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('${u.walletBalance.toStringAsFixed(2)} JOD', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AdminTheme.goldDark)),
                        Text('${u.points} ${widget.isAr ? "نقطة" : "pts"}', style: const TextStyle(fontSize: 10, color: AdminTheme.textSecondary)),
                      ],
                    ),
                  ),
                  DataCell(
                    Text(
                      '${u.createdAt.year}-${u.createdAt.month.toString().padLeft(2, '0')}-${u.createdAt.day.toString().padLeft(2, '0')}',
                      style: const TextStyle(fontSize: 11, color: AdminTheme.textSecondary),
                    ),
                  ),
                  DataCell(
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, color: AdminTheme.goldDark, size: 18),
                          tooltip: widget.isAr ? 'تعديل المستخدم' : 'Edit User',
                          onPressed: () => AdminUserEditDialog.show(
                            context,
                            user: u,
                            isAr: widget.isAr,
                            controller: controller,
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            u.isSuspended ? Icons.lock_open_rounded : Icons.lock_outline_rounded,
                            color: u.isSuspended ? AdminTheme.success : AdminTheme.error,
                            size: 18,
                          ),
                          tooltip: u.isSuspended ? (widget.isAr ? 'تنشيط الحساب' : 'Activate') : (widget.isAr ? 'إيقاف الحساب' : 'Suspend'),
                          onPressed: () async {
                            try {
                              await controller.toggleUserSuspension(u.id);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      u.isSuspended
                                          ? (widget.isAr ? '✅ تم تنشيط الحساب بنجاح' : 'Account activated')
                                          : (widget.isAr ? '⚠️ تم إيقاف الحساب وسحب الجلسات' : 'Account suspended'),
                                      style: const TextStyle(fontFamily: 'Cairo'),
                                    ),
                                    backgroundColor: u.isSuspended ? AdminTheme.success : AdminTheme.error,
                                  ),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('فشل العملية: $e'), backgroundColor: AdminTheme.error),
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
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildMobileUserList(BuildContext context, AdminUsersState state, AdminUsersController controller) {
    return Column(
      children: state.users.map((u) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AdminTheme.cardBorder),
            boxShadow: AdminTheme.cardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: u.isSuspended ? AdminTheme.errorBg : AdminTheme.goldLight,
                    child: Icon(
                      u.isSuspended ? Icons.block_rounded : Icons.person_rounded,
                      size: 18,
                      color: u.isSuspended ? AdminTheme.error : AdminTheme.goldDark,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          u.name ?? (widget.isAr ? 'مستخدم بدون اسم' : 'Unnamed User'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            fontFamily: 'Cairo',
                            color: AdminTheme.textPrimary,
                          ),
                        ),
                        Text(
                          u.phoneNumber,
                          style: const TextStyle(
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: AdminTheme.goldDark,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusBadge(u.isSuspended),
                ],
              ),
              if (u.email != null && u.email!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('✉️ ${u.email}', style: const TextStyle(fontSize: 11, color: AdminTheme.textMuted)),
              ],
              const SizedBox(height: 12),
              const Divider(color: AdminTheme.cardBorder, height: 1),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildRoleBadge(u.role),
                  Row(
                    children: [
                      Text(
                        '${u.walletBalance.toStringAsFixed(2)} JOD',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AdminTheme.goldDark),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '• ${u.points} ${widget.isAr ? "نقطة" : "pts"}',
                        style: const TextStyle(fontSize: 11, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${u.createdAt.year}-${u.createdAt.month.toString().padLeft(2, '0')}-${u.createdAt.day.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 10, color: AdminTheme.textMuted),
                  ),
                  Row(
                    children: [
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          backgroundColor: AdminTheme.goldLight.withValues(alpha: 0.3),
                        ),
                        icon: const Icon(Icons.edit_outlined, size: 16, color: AdminTheme.goldDark),
                        label: Text(widget.isAr ? 'تعديل' : 'Edit', style: const TextStyle(fontSize: 11, color: AdminTheme.goldDark, fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                        onPressed: () => AdminUserEditDialog.show(
                          context,
                          user: u,
                          isAr: widget.isAr,
                          controller: controller,
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          backgroundColor: u.isSuspended ? AdminTheme.success.withValues(alpha: 0.1) : AdminTheme.errorBg,
                        ),
                        icon: Icon(
                          u.isSuspended ? Icons.lock_open_rounded : Icons.lock_outline_rounded,
                          size: 16,
                          color: u.isSuspended ? AdminTheme.success : AdminTheme.error,
                        ),
                        label: Text(
                          u.isSuspended ? (widget.isAr ? 'تنشيط' : 'Activate') : (widget.isAr ? 'إيقاف' : 'Suspend'),
                          style: TextStyle(
                            fontSize: 11,
                            color: u.isSuspended ? AdminTheme.success : AdminTheme.error,
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onPressed: () async {
                          try {
                            await controller.toggleUserSuspension(u.id);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    u.isSuspended
                                        ? (widget.isAr ? '✅ تم تنشيط الحساب بنجاح' : 'Account activated')
                                        : (widget.isAr ? '⚠️ تم إيقاف الحساب وسحب الجلسات' : 'Account suspended'),
                                    style: const TextStyle(fontFamily: 'Cairo'),
                                  ),
                                  backgroundColor: u.isSuspended ? AdminTheme.success : AdminTheme.error,
                                ),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('فشل العملية: $e'), backgroundColor: AdminTheme.error),
                              );
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPaginationFooter(AdminUsersState state, AdminUsersController controller) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AdminTheme.cardBorder),
        boxShadow: AdminTheme.cardShadow,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 600;

          final infoText = Text(
            widget.isAr
                ? 'الصفحة ${state.page} من ${state.totalPages} (${state.totalCount} مستخدم)'
                : 'Page ${state.page} of ${state.totalPages} (${state.totalCount} users)',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
          );

          final navButtons = Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.chevron_left_rounded, size: 18),
                label: Text(widget.isAr ? 'السابقة' : 'Prev', style: const TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                onPressed: state.page > 1 ? () => controller.setPage(state.page - 1) : null,
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AdminTheme.sidebarBackground,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${state.page}',
                  style: const TextStyle(color: AdminTheme.goldPrimary, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.chevron_right_rounded, size: 18),
                label: Text(widget.isAr ? 'التالية' : 'Next', style: const TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                onPressed: state.page < state.totalPages ? () => controller.setPage(state.page + 1) : null,
              ),
            ],
          );

          if (isNarrow) {
            return Column(
              children: [
                infoText,
                const SizedBox(height: 10),
                navButtons,
              ],
            );
          }

          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              infoText,
              navButtons,
            ],
          );
        },
      ),
    );
  }

  TextStyle _tableHeaderStyle() {
    return const TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w900,
      color: AdminTheme.textPrimary,
      fontFamily: 'Cairo',
    );
  }

  Widget _buildRoleBadge(UserRole role) {
    Color bg;
    Color fg;
    switch (role) {
      case UserRole.admin:
        bg = AdminTheme.warningBg;
        fg = AdminTheme.warning;
        break;
      case UserRole.provider:
        bg = AdminTheme.purpleBg;
        fg = AdminTheme.purple;
        break;
      case UserRole.delivery:
        bg = AdminTheme.infoBg;
        fg = AdminTheme.info;
        break;
      default:
        bg = const Color(0xFFF1F5F9);
        fg = AdminTheme.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: fg.withValues(alpha: 0.2)),
      ),
      child: Text(
        widget.isAr ? role.labelAr : role.labelEn,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: fg, fontFamily: 'Cairo'),
      ),
    );
  }

  Widget _buildStatusBadge(bool isSuspended) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isSuspended ? AdminTheme.errorBg : AdminTheme.successBg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: (isSuspended ? AdminTheme.error : AdminTheme.success).withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: isSuspended ? AdminTheme.error : AdminTheme.success,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            isSuspended ? (widget.isAr ? 'موقوف' : 'Suspended') : (widget.isAr ? 'نشط' : 'Active'),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isSuspended ? AdminTheme.error : AdminTheme.success,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      ),
    );
  }
}

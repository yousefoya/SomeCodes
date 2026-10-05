import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../controllers/admin_stats_controller.dart';
import '../../domain/entities/admin_dashboard_stats.dart';
import '../theme/admin_theme.dart';

class AdminOverviewView extends ConsumerWidget {
  final bool isAr;
  final VoidCallback? onNavigateToUsers;
  final VoidCallback? onNavigateToProviders;
  final VoidCallback? onNavigateToOrders;
  final VoidCallback? onNavigateToServices;
  final ValueChanged<int>? onNavigateTab;

  const AdminOverviewView({
    super.key,
    required this.isAr,
    this.onNavigateToUsers,
    this.onNavigateToProviders,
    this.onNavigateToOrders,
    this.onNavigateToServices,
    this.onNavigateTab,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(adminDashboardStatsProvider);

    return statsAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: AdminTheme.goldPrimary),
      ),
      error: (err, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 48, color: AdminTheme.error),
              const SizedBox(height: 12),
              Text(
                isAr ? 'فشل تحميل الإحصائيات من الخادم' : 'Failed to fetch analytics from DB',
                style: const TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Cairo', fontSize: 15),
              ),
              const SizedBox(height: 6),
              Text(
                err.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: AdminTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AdminTheme.goldPrimary,
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: Text(isAr ? 'إعادة المحاولة' : 'Retry', style: const TextStyle(fontFamily: 'Cairo')),
                onPressed: () => ref.invalidate(adminDashboardStatsProvider),
              ),
            ],
          ),
        ),
      ),
      data: (stats) {
        final screenWidth = MediaQuery.of(context).size.width;
        final isMobile = screenWidth < 700;

        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.all(isMobile ? 14 : 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: AdminTheme.maxContentWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Welcome Banner
                  _buildWelcomeBanner(),
                  SizedBox(height: isMobile ? 16 : 24),

                  // ROW 1: KPI Cards Grid
                  _buildKpiGrid(stats),
                  SizedBox(height: isMobile ? 16 : 24),

                  // ROW 2: Orders Pipeline & Order Status Distribution
                  _buildOrdersAnalyticsRow(stats),
                  SizedBox(height: isMobile ? 16 : 24),

                  // ROW 3: Revenue & Users by Role Breakdown
                  _buildUsersAndRevenueRow(stats),
                  SizedBox(height: isMobile ? 16 : 24),

                  // ROW 4: Recent Orders & Recent Users Data Tables
                  _buildRecentActivityRow(stats),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildWelcomeBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        final textColumn = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isAr ? 'مرحباً، مدير النظام' : 'Welcome back, Administrator',
              style: TextStyle(
                fontSize: isNarrow ? 17 : 20,
                fontWeight: FontWeight.w900,
                color: AdminTheme.textPrimary,
                fontFamily: 'Cairo',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              isAr
                  ? 'إليك ملخص أداء منصة بتنحل والمؤشرات الحية المجمعة من قاعدة البيانات'
                  : 'Here is the platform live operational performance summary aggregated from PostgreSQL',
              style: const TextStyle(
                fontSize: 12,
                color: AdminTheme.textSecondary,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        );

        final badge = Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AdminTheme.goldLight,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AdminTheme.goldPrimary.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.shield_rounded, color: AdminTheme.goldDark, size: 16),
              const SizedBox(width: 6),
              Text(
                isAr ? 'بيانات حية ومحدثة' : 'Live Real-Time Data',
                style: const TextStyle(
                  color: AdminTheme.goldDark,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Cairo',
                ),
              ),
            ],
          ),
        );

        return Container(
          padding: EdgeInsets.all(isNarrow ? 14 : 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AdminTheme.cardBorder),
            boxShadow: AdminTheme.cardShadow,
          ),
          child: isNarrow
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    textColumn,
                    const SizedBox(height: 12),
                    badge,
                  ],
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: textColumn),
                    const SizedBox(width: 16),
                    badge,
                  ],
                ),
        );
      },
    );
  }

  Widget _buildKpiGrid(AdminDashboardStats stats) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final int crossAxisCount;
        final double childAspectRatio;

        if (width >= 1100) {
          crossAxisCount = 6;
          childAspectRatio = 1.35;
        } else if (width >= 750) {
          crossAxisCount = 3;
          childAspectRatio = 1.4;
        } else if (width >= 400) {
          crossAxisCount = 2;
          childAspectRatio = 1.15;
        } else {
          crossAxisCount = 2;
          childAspectRatio = 1.05;
        }

        final spacing = width < 500 ? 10.0 : 14.0;

        return GridView.count(
          crossAxisCount: crossAxisCount,
          crossAxisSpacing: spacing,
          mainAxisSpacing: spacing,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: childAspectRatio,
          children: [
            _buildKpiCard(
              title: isAr ? 'إجمالي الإيرادات' : 'Total Revenue',
              value: '${stats.totalRevenue.toStringAsFixed(2)} JOD',
              icon: Icons.account_balance_wallet_rounded,
              color: AdminTheme.warning,
              subtitle: isAr ? 'الطلبات المكتملة' : 'Completed orders',
              onTap: () {
                onNavigateToOrders?.call();
                onNavigateTab?.call(3);
              },
            ),
            _buildKpiCard(
              title: isAr ? 'إجمالي الطلبات' : 'Total Orders',
              value: '${stats.totalOrders}',
              icon: Icons.shopping_bag_rounded,
              color: AdminTheme.info,
              subtitle: '${stats.completedOrders} ${isAr ? "مكتمل" : "completed"}',
              onTap: () {
                onNavigateToOrders?.call();
                onNavigateTab?.call(3);
              },
            ),
            _buildKpiCard(
              title: isAr ? 'طلبات قيد التنفيذ' : 'In-Progress Orders',
              value: '${stats.activeOrders}',
              icon: Icons.pending_actions_rounded,
              color: AdminTheme.goldDark,
              subtitle: isAr ? 'قيد المعالجة والتوصيل' : 'In delivery pipeline',
              onTap: () {
                onNavigateToOrders?.call();
                onNavigateTab?.call(3);
              },
            ),
            _buildKpiCard(
              title: isAr ? 'المستخدمين المسجلين' : 'Registered Users',
              value: '${stats.totalUsers}',
              icon: Icons.people_alt_rounded,
              color: AdminTheme.textPrimary,
              subtitle: '${stats.activeUsers} ${isAr ? "نشط" : "active"}',
              onTap: () {
                onNavigateToUsers?.call();
                onNavigateTab?.call(1);
              },
            ),
            _buildKpiCard(
              title: isAr ? 'مقدمو الخدمة' : 'Active Providers',
              value: '${stats.activeProviders}/${stats.totalProviders}',
              icon: Icons.storefront_rounded,
              color: AdminTheme.purple,
              subtitle: isAr ? 'مراكز ومحطات معتمدة' : 'Authorized hubs',
              onTap: () {
                onNavigateToProviders?.call();
                onNavigateTab?.call(2);
              },
            ),
            _buildKpiCard(
              title: isAr ? 'كتالوج الخدمات' : 'Services Catalog',
              value: '9 ${isAr ? "خدمات" : "Services"}',
              icon: Icons.category_rounded,
              color: AdminTheme.success,
              subtitle: isAr ? 'الكتالوج الموحد' : 'Canonical catalog',
              onTap: () {
                onNavigateToServices?.call();
                onNavigateTab?.call(4);
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AdminTheme.cardBorder),
            boxShadow: AdminTheme.cardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AdminTheme.textSecondary,
                        fontFamily: 'Cairo',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, color: color, size: 16),
                  ),
                ],
              ),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: isAr ? Alignment.centerRight : Alignment.centerLeft,
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: color,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 9.5,
                  color: AdminTheme.textMuted,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Cairo',
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrdersAnalyticsRow(AdminDashboardStats stats) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;

        final card1 = _buildChartCard(
          title: isAr ? 'مخطط سير وحالة الطلبات' : 'Order Lifecycle Breakdown',
          child: Column(
            children: [
              _buildProgressRow(
                title: isAr ? 'الطلبات المكتملة' : 'Completed Orders',
                count: stats.completedOrders,
                total: stats.totalOrders,
                color: AdminTheme.success,
              ),
              const SizedBox(height: 12),
              _buildProgressRow(
                title: isAr ? 'طلبات قيد التنفيذ والتوصيل' : 'In-Delivery Orders',
                count: stats.activeOrders,
                total: stats.totalOrders,
                color: AdminTheme.info,
              ),
              const SizedBox(height: 12),
              _buildProgressRow(
                title: isAr ? 'طلبات ملغية أو متعذرة' : 'Cancelled / Rejected',
                count: stats.cancelledOrders,
                total: stats.totalOrders,
                color: AdminTheme.error,
              ),
            ],
          ),
        );

        final card2 = _buildChartCard(
          title: isAr ? 'مؤشر كفاءة التشغيل والتسليم' : 'Operational Delivery Efficiency',
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMetricCircle(
                    label: isAr ? 'نسبة الإنجاز' : 'Success Rate',
                    value: stats.totalOrders > 0
                        ? '${((stats.completedOrders / stats.totalOrders) * 100).toStringAsFixed(1)}%'
                        : '100%',
                    color: AdminTheme.success,
                  ),
                  _buildMetricCircle(
                    label: isAr ? 'المزودين النشطين' : 'Active Hubs',
                    value: stats.totalProviders > 0
                        ? '${((stats.activeProviders / stats.totalProviders) * 100).toStringAsFixed(0)}%'
                        : '100%',
                    color: AdminTheme.purple,
                  ),
                  _buildMetricCircle(
                    label: isAr ? 'المستخدمين النشطين' : 'Active Users',
                    value: stats.totalUsers > 0
                        ? '${((stats.activeUsers / stats.totalUsers) * 100).toStringAsFixed(0)}%'
                        : '100%',
                    color: AdminTheme.goldDark,
                  ),
                ],
              ),
            ],
          ),
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: card1),
              const SizedBox(width: 16),
              Expanded(child: card2),
            ],
          );
        } else {
          return Column(
            children: [
              card1,
              const SizedBox(height: 16),
              card2,
            ],
          );
        }
      },
    );
  }

  Widget _buildUsersAndRevenueRow(AdminDashboardStats stats) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;

        final card1 = _buildChartCard(
          title: isAr ? 'توزيع المستخدمين حسب الدور في النظام' : 'Users by Role Distribution',
          child: Column(
            children: [
              _buildProgressRow(
                title: isAr ? 'العملاء (Customers)' : 'Customers',
                count: stats.usersByRole.customer,
                total: stats.totalUsers,
                color: AdminTheme.info,
              ),
              const SizedBox(height: 10),
              _buildProgressRow(
                title: isAr ? 'مقدمو الخدمة (Providers)' : 'Providers',
                count: stats.usersByRole.provider,
                total: stats.totalUsers,
                color: AdminTheme.purple,
              ),
              const SizedBox(height: 10),
              _buildProgressRow(
                title: isAr ? 'المدراء (Admins)' : 'Admins',
                count: stats.usersByRole.admin,
                total: stats.totalUsers,
                color: AdminTheme.warning,
              ),
            ],
          ),
        );

        final card2 = _buildChartCard(
          title: isAr ? 'حالة حسابات المستخدمين' : 'User Account Status',
          child: Column(
            children: [
              _buildProgressRow(
                title: isAr ? 'حسابات نشطة ومفعلة' : 'Active Accounts',
                count: stats.activeUsers,
                total: stats.totalUsers,
                color: AdminTheme.success,
              ),
              const SizedBox(height: 14),
              _buildProgressRow(
                title: isAr ? 'حسابات موقوفة (Suspended)' : 'Suspended Accounts',
                count: stats.suspendedUsers,
                total: stats.totalUsers,
                color: AdminTheme.error,
              ),
            ],
          ),
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: card1),
              const SizedBox(width: 16),
              Expanded(child: card2),
            ],
          );
        } else {
          return Column(
            children: [
              card1,
              const SizedBox(height: 16),
              card2,
            ],
          );
        }
      },
    );
  }

  Widget _buildRecentActivityRow(AdminDashboardStats stats) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;

        final recentOrdersCard = _buildChartCard(
          title: isAr ? 'أحدث الطلبات الواردة' : 'Recent Platform Orders',
          headerAction: TextButton(
            onPressed: () {
              onNavigateToOrders?.call();
              onNavigateTab?.call(4);
            },
            child: Text(isAr ? 'عرض الكل' : 'View All', style: const TextStyle(fontFamily: 'Cairo', fontSize: 12)),
          ),
          child: stats.recentOrders.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                      isAr ? 'لا توجد طلبات مسجلة حتى الآن' : 'No recent orders found',
                      style: const TextStyle(color: AdminTheme.textMuted, fontFamily: 'Cairo'),
                    ),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: stats.recentOrders.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: AdminTheme.cardBorder),
                  itemBuilder: (context, index) {
                    final o = stats.recentOrders[index];
                    return InkWell(
                      onTap: () {
                        onNavigateToOrders?.call();
                        onNavigateTab?.call(4);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AdminTheme.goldLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.receipt_rounded, color: AdminTheme.goldDark, size: 16),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${o.id} • ${o.customerName ?? "عميل"}',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, fontFamily: 'Cairo'),
                                  ),
                                  Text(
                                    '📍 ${o.deliveryArea ?? "عمان"}',
                                    style: const TextStyle(fontSize: 10, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${o.totalAmount.toStringAsFixed(2)} JOD',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AdminTheme.textPrimary, fontFamily: 'Cairo'),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: o.status == 'completed'
                                        ? AdminTheme.successBg
                                        : AdminTheme.warningBg,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    o.status,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: o.status == 'completed' ? AdminTheme.success : AdminTheme.warning,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        );

        final recentUsersCard = _buildChartCard(
          title: isAr ? 'أحدث المستخدمين المسجلين' : 'Latest Registered Users',
          headerAction: TextButton(
            onPressed: () {
              onNavigateToUsers?.call();
              onNavigateTab?.call(1);
            },
            child: Text(isAr ? 'عرض الكل' : 'View All', style: const TextStyle(fontFamily: 'Cairo', fontSize: 12)),
          ),
          child: stats.recentUsers.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                      isAr ? 'لا يوجد مستخدمين مسجلين' : 'No recent users found',
                      style: const TextStyle(color: AdminTheme.textMuted, fontFamily: 'Cairo'),
                    ),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: stats.recentUsers.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: AdminTheme.cardBorder),
                  itemBuilder: (context, index) {
                    final u = stats.recentUsers[index];
                    return InkWell(
                      onTap: () {
                        onNavigateToUsers?.call();
                        onNavigateTab?.call(1);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: u.isSuspended ? AdminTheme.errorBg : AdminTheme.goldLight,
                              child: Icon(
                                u.isSuspended ? Icons.block_rounded : Icons.person_rounded,
                                size: 16,
                                color: u.isSuspended ? AdminTheme.error : AdminTheme.goldDark,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    u.name ?? (isAr ? 'مستخدم بدون اسم' : 'Unnamed User'),
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, fontFamily: 'Cairo'),
                                  ),
                                  Text(
                                    '📱 ${u.phoneNumber} • ${u.role}',
                                    style: const TextStyle(fontSize: 10, color: AdminTheme.textSecondary, fontFamily: 'Cairo'),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: u.isSuspended ? AdminTheme.errorBg : AdminTheme.successBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                u.isSuspended ? (isAr ? 'موقوف' : 'Suspended') : (isAr ? 'نشط' : 'Active'),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: u.isSuspended ? AdminTheme.error : AdminTheme.success,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: recentOrdersCard),
              const SizedBox(width: 16),
              Expanded(child: recentUsersCard),
            ],
          );
        } else {
          return Column(
            children: [
              recentOrdersCard,
              const SizedBox(height: 16),
              recentUsersCard,
            ],
          );
        }
      },
    );
  }

  Widget _buildChartCard({
    required String title,
    required Widget child,
    Widget? headerAction,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: AdminTheme.textPrimary,
                    fontFamily: 'Cairo',
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (headerAction != null) headerAction,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildProgressRow({
    required String title,
    required int count,
    required int total,
    required Color color,
  }) {
    final pct = total > 0 ? (count / total) : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: AdminTheme.textPrimary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '$count (${(pct * 100).toStringAsFixed(0)}%)',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color, fontFamily: 'Cairo'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: const Color(0xFFF1F5F9),
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCircle({
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Container(
          width: 70,
          height: 70,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.1),
            border: Border.all(color: color, width: 2),
          ),
          alignment: Alignment.center,
          child: Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: color,
              fontFamily: 'Cairo',
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AdminTheme.textSecondary,
            fontFamily: 'Cairo',
          ),
        ),
      ],
    );
  }
}

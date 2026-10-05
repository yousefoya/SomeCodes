import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/routing/route_paths.dart';
import '../../../../core/widgets/server_config_dialog.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../providers/presentation/controllers/providers_controller.dart';
import '../controllers/admin_stats_controller.dart';
import '../controllers/admin_users_controller.dart';
import '../theme/admin_theme.dart';
import '../widgets/admin_coupons_view.dart';
import '../widgets/admin_header.dart';
import '../widgets/admin_loyalty_view.dart';
import '../widgets/admin_orders_view.dart';
import '../widgets/admin_overview_view.dart';
import '../widgets/admin_providers_view.dart';
import '../widgets/admin_services_view.dart';
import '../widgets/admin_settings_view.dart';
import '../widgets/admin_sidebar.dart';
import '../widgets/admin_users_view.dart';

/// Enterprise SaaS Admin Portal Dashboard for بتنحل (btin7al)
/// Desktop/Tablet-first layout with fixed RTL sidebar, sticky live header,
/// and 9 modular management views connected to PostgreSQL.
class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  int _selectedTabIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    // Initial data fetch
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.invalidate(adminDashboardStatsProvider);
      ref.read(adminUsersControllerProvider.notifier).loadUsers();
      ref.read(providersControllerProvider.notifier).loadProviders();
    });
  }

  void _handleRefresh() {
    ref.invalidate(adminDashboardStatsProvider);
    ref.read(adminUsersControllerProvider.notifier).loadUsers();
    ref.read(providersControllerProvider.notifier).loadProviders();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('تم تحديث البيانات من الخادم بنجاح'),
        backgroundColor: AdminTheme.success,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('تسجيل الخروج من لوحة الإدارة', style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
        content: const Text('هل أنت متأكد من رغبتك في تسجيل الخروج؟'),
        actions: [
          TextButton(child: const Text('إلغاء'), onPressed: () => Navigator.of(ctx).pop(false)),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AdminTheme.error),
            child: const Text('تسجيل الخروج', style: TextStyle(color: Colors.white)),
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(authControllerProvider.notifier).logout();
      if (mounted) context.go(RoutePaths.login);
    }
  }

  void _handleToggleLanguage() {
    ref.read(appLocaleProvider.notifier).toggleLocale();
  }

  void _handleOpenServerSettings(bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) => ServerConfigDialog(isAr: isAr),
    );
  }

  void _handlePreviewStore() {
    context.push(RoutePaths.home);
  }

  String _getTabTitle(int index, bool isAr) {
    if (index >= 0 && index < AdminSidebar.navItems.length) {
      final item = AdminSidebar.navItems[index];
      return isAr ? item.titleAr : item.titleEn;
    }
    return isAr ? 'لوحة التحكم' : 'Overview';
  }

  Widget _buildCurrentTab(bool isAr) {
    switch (_selectedTabIndex) {
      case 0:
        return AdminOverviewView(
          isAr: isAr,
          onNavigateToUsers: () => setState(() => _selectedTabIndex = 1),
          onNavigateToProviders: () => setState(() => _selectedTabIndex = 2),
          onNavigateToOrders: () => setState(() => _selectedTabIndex = 3),
          onNavigateToServices: () => setState(() => _selectedTabIndex = 4),
          onNavigateTab: (index) => setState(() => _selectedTabIndex = index),
        );
      case 1:
        return AdminUsersView(isAr: isAr);
      case 2:
        return AdminProvidersView(isAr: isAr);
      case 3:
        return AdminOrdersView(isAr: isAr);
      case 4:
        return AdminServicesView(isAr: isAr);
      case 5:
        return AdminCouponsView(isAr: isAr);
      case 6:
        return AdminLoyaltyView(isAr: isAr);
      case 7:
        return AdminSettingsView(isAr: isAr);
      default:
        return AdminOverviewView(
          isAr: isAr,
          onNavigateToUsers: () => setState(() => _selectedTabIndex = 1),
          onNavigateToProviders: () => setState(() => _selectedTabIndex = 2),
          onNavigateToOrders: () => setState(() => _selectedTabIndex = 3),
          onNavigateToServices: () => setState(() => _selectedTabIndex = 4),
          onNavigateTab: (index) => setState(() => _selectedTabIndex = index),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= AdminTheme.breakpointDesktop;

    final sidebarWidget = AdminSidebar(
      selectedIndex: _selectedTabIndex,
      isAr: isAr,
      onItemSelected: (index) {
        setState(() => _selectedTabIndex = index);
        if (!isDesktop && _scaffoldKey.currentState?.isDrawerOpen == true) {
          Navigator.of(context).pop();
        }
      },
      onLogout: _handleLogout,
    );

    return Directionality(
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: AdminTheme.bodyBackground,
        drawer: !isDesktop ? Drawer(child: sidebarWidget) : null,
        body: SafeArea(
          bottom: false,
          child: Row(
            children: [
              // Fixed RTL Desktop Sidebar
              if (isDesktop) sidebarWidget,

              // Main Content Area
              Expanded(
                child: Column(
                  children: [
                    // Sticky Top Header
                    AdminHeader(
                      title: _getTabTitle(_selectedTabIndex, isAr),
                      subtitle: isAr ? 'نظام إدارة بتنحل المركزي - الإصدار المؤسسي 2.0' : 'btin7al Central Management System v2.0',
                      isAr: isAr,
                      isDesktop: isDesktop,
                      onToggleDrawer: () => _scaffoldKey.currentState?.openDrawer(),
                      onRefresh: _handleRefresh,
                      onServerSettings: () => _handleOpenServerSettings(isAr),
                      onToggleLanguage: _handleToggleLanguage,
                      onPreviewStore: _handlePreviewStore,
                      onLogout: _handleLogout,
                    ),

                    // Active Tab View Canvas
                    Expanded(
                      child: _buildCurrentTab(isAr),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../theme/admin_theme.dart';

class AdminNavigationItem {
  final IconData icon;
  final String titleAr;
  final String titleEn;
  final String? badge;

  const AdminNavigationItem({
    required this.icon,
    required this.titleAr,
    required this.titleEn,
    this.badge,
  });
}

class AdminSidebar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onItemSelected;
  final bool isAr;
  final VoidCallback onLogout;

  const AdminSidebar({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
    required this.isAr,
    required this.onLogout,
  });

  static const List<AdminNavigationItem> navItems = [
    AdminNavigationItem(
      icon: Icons.dashboard_rounded,
      titleAr: 'لوحة التحكم',
      titleEn: 'Overview & KPIs',
    ),
    AdminNavigationItem(
      icon: Icons.people_alt_rounded,
      titleAr: 'المستخدمون',
      titleEn: 'Users Management',
    ),
    AdminNavigationItem(
      icon: Icons.storefront_rounded,
      titleAr: 'مقدمو الخدمة',
      titleEn: 'Providers & Hubs',
    ),
    AdminNavigationItem(
      icon: Icons.receipt_long_rounded,
      titleAr: 'الطلبات والإسناد',
      titleEn: 'Orders & Dispatch',
    ),
    AdminNavigationItem(
      icon: Icons.category_rounded,
      titleAr: 'الخدمات والمنتجات',
      titleEn: 'Services Catalog',
    ),
    AdminNavigationItem(
      icon: Icons.local_offer_rounded,
      titleAr: 'الكوبونات والعروض',
      titleEn: 'Coupons & Promos',
    ),
    AdminNavigationItem(
      icon: Icons.stars_rounded,
      titleAr: 'نظام الولاء',
      titleEn: 'Loyalty System',
    ),
    AdminNavigationItem(
      icon: Icons.settings_suggest_rounded,
      titleAr: 'الإعدادات والاتصال',
      titleEn: 'Settings & API',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: AdminTheme.sidebarWidth,
      height: double.infinity,
      color: AdminTheme.sidebarBackground,
      child: Column(
        children: [
          // Logo & Brand Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AdminTheme.sidebarBorder, width: 1),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AdminTheme.goldPrimary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AdminTheme.goldPrimary.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(
                    Icons.admin_panel_settings_rounded,
                    color: AdminTheme.goldPrimary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAr ? 'بتنحل | AL7BTIN' : 'btin7al Portal',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AdminTheme.goldPrimary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'ENTERPRISE SAAS',
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Navigation Items (Scrollable if viewport is short)
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
              itemCount: navItems.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final item = navItems[index];
                final isSelected = selectedIndex == index;

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => onItemSelected(index),
                    borderRadius: BorderRadius.circular(10),
                    hoverColor: AdminTheme.sidebarHover,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: isSelected ? AdminTheme.sidebarActive : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: isSelected
                            ? Border.all(color: AdminTheme.goldPrimary.withValues(alpha: 0.5), width: 1)
                            : null,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            item.icon,
                            color: isSelected ? AdminTheme.goldPrimary : const Color(0xFF94A3B8),
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              isAr ? item.titleAr : item.titleEn,
                              style: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ),
                          if (isSelected)
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: AdminTheme.goldPrimary,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // User Profile & Database Status Footer
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFF0B1120),
              border: Border(
                top: BorderSide(color: AdminTheme.sidebarBorder, width: 1),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 18,
                      backgroundColor: Color(0xFF1E293B),
                      child: Icon(Icons.shield_rounded, color: AdminTheme.goldPrimary, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isAr ? 'مدير النظام الرئيسي' : 'Super Administrator',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Cairo',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Row(
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: AdminTheme.success,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 5),
                              const Text(
                                'PostgreSQL Live',
                                style: TextStyle(
                                  color: AdminTheme.success,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout_rounded, color: AdminTheme.error, size: 18),
                      tooltip: isAr ? 'تسجيل الخروج' : 'Logout',
                      onPressed: onLogout,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

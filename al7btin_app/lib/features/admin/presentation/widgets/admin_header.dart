import 'package:flutter/material.dart';
import '../theme/admin_theme.dart';

class AdminHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool isAr;
  final bool isDesktop;
  final VoidCallback onToggleDrawer;
  final VoidCallback onRefresh;
  final VoidCallback onServerSettings;
  final VoidCallback onToggleLanguage;
  final VoidCallback onPreviewStore;
  final VoidCallback onLogout;

  const AdminHeader({
    super.key,
    required this.title,
    this.subtitle,
    required this.isAr,
    required this.isDesktop,
    required this.onToggleDrawer,
    required this.onRefresh,
    required this.onServerSettings,
    required this.onToggleLanguage,
    required this.onPreviewStore,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 600;

    return Container(
      height: 64,
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 20 : 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: AdminTheme.cardBorder, width: 1),
        ),
      ),
      child: Row(
        children: [
          if (!isDesktop) ...[
            IconButton(
              icon: const Icon(Icons.menu_rounded, color: AdminTheme.textPrimary),
              onPressed: onToggleDrawer,
              visualDensity: VisualDensity.compact,
              tooltip: isAr ? 'القائمة الرئيسية' : 'Menu',
            ),
            const SizedBox(width: 4),
          ],

          // Title & Subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: AdminTheme.textPrimary,
                    fontSize: isCompact ? 14 : 16,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo',
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitle != null && !isCompact)
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      color: AdminTheme.textMuted,
                      fontSize: 11,
                      fontFamily: 'Cairo',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),

          // Backend Live Status Pill (Desktop only)
          if (isDesktop) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AdminTheme.successBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AdminTheme.success.withValues(alpha: 0.3)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_circle_rounded, color: AdminTheme.success, size: 14),
                  SizedBox(width: 6),
                  Text(
                    'REST API & DB Connected',
                    style: TextStyle(
                      color: AdminTheme.success,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Cairo',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
          ],

          // Action Buttons
          if (!isCompact) ...[
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AdminTheme.textSecondary, size: 20),
              tooltip: isAr ? 'تحديث البيانات' : 'Refresh Data',
              onPressed: onRefresh,
            ),
            IconButton(
              icon: const Icon(Icons.dns_rounded, color: AdminTheme.goldDark, size: 20),
              tooltip: isAr ? 'إعدادات اتصال الخادم' : 'Server Settings',
              onPressed: onServerSettings,
            ),
            IconButton(
              icon: const Icon(Icons.language_rounded, color: AdminTheme.textSecondary, size: 20),
              tooltip: isAr ? 'English' : 'العربية',
              onPressed: onToggleLanguage,
            ),
            IconButton(
              icon: const Icon(Icons.storefront_outlined, color: AdminTheme.goldDark, size: 22),
              tooltip: isAr ? 'معاينة متجر العملاء' : 'Customer Store View',
              onPressed: onPreviewStore,
            ),
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: AdminTheme.error, size: 20),
              tooltip: isAr ? 'تسجيل الخروج' : 'Logout',
              onPressed: onLogout,
            ),
          ] else ...[
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AdminTheme.textSecondary, size: 20),
              visualDensity: VisualDensity.compact,
              tooltip: isAr ? 'تحديث البيانات' : 'Refresh',
              onPressed: onRefresh,
            ),
            IconButton(
              icon: const Icon(Icons.language_rounded, color: AdminTheme.textSecondary, size: 20),
              visualDensity: VisualDensity.compact,
              tooltip: isAr ? 'English' : 'العربية',
              onPressed: onToggleLanguage,
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded, color: AdminTheme.textPrimary, size: 20),
              padding: EdgeInsets.zero,
              onSelected: (val) {
                switch (val) {
                  case 'server':
                    onServerSettings();
                    break;
                  case 'store':
                    onPreviewStore();
                    break;
                  case 'logout':
                    onLogout();
                    break;
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'server',
                  child: Row(
                    children: [
                      const Icon(Icons.dns_rounded, color: AdminTheme.goldDark, size: 18),
                      const SizedBox(width: 8),
                      Text(isAr ? 'إعدادات الخادم' : 'Server Config', style: const TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'store',
                  child: Row(
                    children: [
                      const Icon(Icons.storefront_outlined, color: AdminTheme.goldDark, size: 18),
                      const SizedBox(width: 8),
                      Text(isAr ? 'معاينة المتجر' : 'Store Preview', style: const TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'logout',
                  child: Row(
                    children: [
                      const Icon(Icons.logout_rounded, color: AdminTheme.error, size: 18),
                      const SizedBox(width: 8),
                      Text(isAr ? 'تسجيل الخروج' : 'Logout', style: const TextStyle(fontFamily: 'Cairo', color: AdminTheme.error, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

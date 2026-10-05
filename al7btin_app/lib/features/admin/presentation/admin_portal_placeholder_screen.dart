import 'package:flutter/material.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/widgets/placeholder_screen_scaffold.dart';

/// Placeholder screen for Admin Dashboard integration & gateway
class AdminPortalPlaceholderScreen extends StatelessWidget {
  const AdminPortalPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreenScaffold(
      title: AppStrings.titleAdminPortal,
      moduleName: 'لوحة التحكم الإدارية (Admin Dashboard Portal)',
      description:
          'هذا القسم مهيأ للربط مع لوحة التحكم المركزية (React / Vite + Node.js REST API) لإدارة الفئات والخدمات ديناميكياً، والموافقة على المزودين والفنيين، ومراقبة العمليات المالية، والشكاوى والتدقيق.',
      icon: Icons.admin_panel_settings_rounded,
    );
  }
}

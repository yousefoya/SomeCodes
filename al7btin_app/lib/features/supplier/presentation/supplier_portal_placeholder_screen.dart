import 'package:flutter/material.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/widgets/placeholder_screen_scaffold.dart';

/// Placeholder screen for Supplier & Partner operations module
class SupplierPortalPlaceholderScreen extends StatelessWidget {
  const SupplierPortalPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreenScaffold(
      title: AppStrings.titleSupplierPortal,
      moduleName: 'نظام الموردين والشركاء (Suppliers / Providers)',
      description:
          'هذا القسم مهيأ لإدارة تسجيل الموردين، المنتجات، الكميات، الأسعار، مناطق التغطية، ساعات العمل، وقبول/رفض الطلبات، وتقارير العمولات والتسويات المالية.',
      icon: Icons.store_rounded,
    );
  }
}

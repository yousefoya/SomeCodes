import 'package:flutter/material.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/widgets/placeholder_screen_scaffold.dart';

/// Placeholder screen for Technician & Craftsman operations module
class TechnicianPortalPlaceholderScreen extends StatelessWidget {
  const TechnicianPortalPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreenScaffold(
      title: AppStrings.titleTechnicianPortal,
      moduleName: 'نظام الفنيين والحرفيين (Technicians / Craftsmen)',
      description:
          'هذا القسم مهيأ لإدارة ملفات الفنيين، التخصصات، مناطق التغطية، استقبال طلبات الخدمات المنزلية، تقديم عروض الأسعار التفصيلية (كشفية + أجور يد + قطع غيار)، رفع صور قبل وبعد، وتقارير الأرباح.',
      icon: Icons.handyman_rounded,
    );
  }
}

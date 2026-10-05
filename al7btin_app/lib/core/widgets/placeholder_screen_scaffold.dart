import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../constants/app_strings.dart';
import 'custom_app_bar.dart';
import 'gold_gradient_card.dart';

/// Reusable scaffold for placeholder screens during architecture phase
class PlaceholderScreenScaffold extends StatelessWidget {
  final String title;
  final String moduleName;
  final String description;
  final IconData icon;
  final List<Widget>? actionButtons;
  final bool showBackButton;

  const PlaceholderScreenScaffold({
    super.key,
    required this.title,
    required this.moduleName,
    required this.description,
    required this.icon,
    this.actionButtons,
    this.showBackButton = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: title,
        showBackButton: showBackButton,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 24),
              // Glowing Icon Container
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.goldPrimary, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.goldPrimary.withValues(alpha: 0.25),
                      blurRadius: 24,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(
                  icon,
                  size: 44,
                  color: AppColors.goldDark,
                ),
              ),
              const SizedBox(height: 24),
              // Module Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.goldPrimary.withValues(alpha: 0.12),
                  borderRadius: AppDimensions.borderRadiusFull,
                  border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.4)),
                ),
                child: Text(
                  moduleName,
                  style: const TextStyle(
                    color: AppColors.goldDark,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Screen Title
              Text(
                title,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  fontFamily: 'Cairo',
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              // Description
              Text(
                description,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  fontFamily: 'Cairo',
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              // Architectural Readiness Card
              const GoldGradientCard(
                hasGoldBorder: true,
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline_rounded, color: AppColors.goldDark, size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            AppStrings.placeholderNotice,
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.goldDark,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 10),
                    Text(
                      'تم إعداد وتجهيز مسار ومكونات هذا القسم وفق الهيكلية النموذجية (Feature-First Clean Architecture)، وهو بانتظار استكمال وحدات الأعمال وربط واجهات الـ API في المراحل القادمة.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                        fontFamily: 'Cairo',
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              if (actionButtons != null && actionButtons!.isNotEmpty) ...[
                const SizedBox(height: 24),
                ...actionButtons!,
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

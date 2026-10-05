import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

/// Modern Luxury card container with crisp white background, subtle border, and soft elevation
class GoldGradientCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final bool hasGoldBorder;
  final Color? backgroundColor;
  final double borderRadius;

  const GoldGradientCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.hasGoldBorder = false,
    this.backgroundColor,
    this.borderRadius = 16.0,
  });

  @override
  Widget build(BuildContext context) {
    final border = Border.all(
      color: hasGoldBorder ? AppColors.goldPrimary.withValues(alpha: 0.8) : AppColors.border,
      width: hasGoldBorder ? 1.2 : 0.8,
    );

    final shadows = [
      BoxShadow(
        color: hasGoldBorder
            ? AppColors.goldPrimary.withValues(alpha: 0.12)
            : Colors.black.withValues(alpha: 0.03),
        blurRadius: 12,
        offset: const Offset(0, 3),
      ),
    ];

    final content = Container(
      padding: padding ?? const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.card,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border,
        boxShadow: shadows,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          splashColor: AppColors.goldPrimary.withValues(alpha: 0.1),
          highlightColor: AppColors.goldPrimary.withValues(alpha: 0.05),
          child: content,
        ),
      );
    }

    return content;
  }
}

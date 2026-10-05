import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

enum ButtonVariant {
  primary,
  secondary,
  outline,
  ghost,
}

/// Production reusable button with modern gold gradients and states
class CustomButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final bool isLoading;
  final IconData? icon;
  final double? width;
  final double height;

  const CustomButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = ButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.width,
    this.height = AppDimensions.buttonHeightMd,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = onPressed != null && !isLoading;
    final isPrimary = variant == ButtonVariant.primary;
    final isOutline = variant == ButtonVariant.outline;

    final BoxDecoration decoration;
    if (isPrimary) {
      decoration = BoxDecoration(
        gradient: isEnabled ? AppColors.goldGradient : null,
        color: isEnabled ? null : AppColors.border,
        borderRadius: BorderRadius.circular(14),
        boxShadow: isEnabled
            ? [
                BoxShadow(
                  color: AppColors.goldPrimary.withValues(alpha: 0.32),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      );
    } else if (isOutline) {
      decoration = BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isEnabled ? AppColors.goldPrimary : AppColors.border,
          width: 1.5,
        ),
      );
    } else {
      decoration = BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
      );
    }

    final Color textColor;
    if (isPrimary) {
      textColor = isEnabled ? Colors.white : AppColors.textMuted;
    } else {
      textColor = isEnabled ? AppColors.goldDark : AppColors.textMuted;
    }

    return Container(
      width: width ?? double.infinity,
      height: height,
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isEnabled ? onPressed : null,
          borderRadius: BorderRadius.circular(14),
          splashColor: isPrimary
              ? Colors.white.withValues(alpha: 0.2)
              : AppColors.goldPrimary.withValues(alpha: 0.15),
          highlightColor: isPrimary
              ? Colors.white.withValues(alpha: 0.1)
              : AppColors.goldPrimary.withValues(alpha: 0.05),
          child: Center(
            child: _buildChild(textColor),
          ),
        ),
      ),
    );
  }

  Widget _buildChild(Color textColor) {
    if (isLoading) {
      return SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation<Color>(textColor),
        ),
      );
    }

    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: AppDimensions.iconSm, color: textColor),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 15,
              color: textColor,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      );
    }

    return Text(
      label,
      style: TextStyle(
        fontWeight: FontWeight.w800,
        fontSize: 15,
        color: textColor,
        fontFamily: 'Cairo',
      ),
    );
  }
}

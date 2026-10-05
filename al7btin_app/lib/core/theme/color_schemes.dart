import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

/// Defines Material 3 Light & Dark ColorSchemes adhering to the White & Gold brand identity
class AppColorSchemes {
  AppColorSchemes._();

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.goldPrimary,
    onPrimary: Colors.white,
    primaryContainer: AppColors.goldLight,
    onPrimaryContainer: AppColors.textOnGold,
    secondary: AppColors.goldDark,
    onSecondary: Colors.white,
    secondaryContainer: AppColors.backgroundSecondary,
    onSecondaryContainer: AppColors.textPrimary,
    tertiary: AppColors.goldAccent,
    onTertiary: Colors.white,
    error: AppColors.error,
    onError: Colors.white,
    surface: AppColors.surface,
    onSurface: AppColors.textPrimary,
    outline: AppColors.border,
    outlineVariant: AppColors.borderLight,
    shadow: Color(0x14000000),
  );
}

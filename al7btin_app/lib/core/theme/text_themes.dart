import 'package:flutter/material.dart';
import '../constants/app_typography.dart';

/// TextTheme builder for Cairo font styling in Light theme
class AppTextThemes {
  AppTextThemes._();

  static TextTheme get lightTextTheme {
    return const TextTheme(
      displayLarge: AppTypography.displayLarge,
      displayMedium: AppTypography.displayMedium,
      titleLarge: AppTypography.titleLarge,
      titleMedium: AppTypography.titleMedium,
      titleSmall: AppTypography.titleSmall,
      bodyLarge: AppTypography.bodyLarge,
      bodyMedium: AppTypography.bodyMedium,
      bodySmall: AppTypography.bodySmall,
      labelLarge: AppTypography.labelLarge,
      labelMedium: AppTypography.labelMedium,
    );
  }
}

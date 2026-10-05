import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_strings.dart';

/// Reusable brand logo widget for بتنحل (AL7BTIN) - White & Gold Luxury
class BrandLogo extends StatelessWidget {
  final double size;
  final bool showSlogan;
  final bool showEnglish;

  const BrandLogo({
    super.key,
    this.size = 80.0,
    this.showSlogan = true,
    this.showEnglish = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.goldGradient,
            boxShadow: [
              BoxShadow(
                color: AppColors.goldPrimary.withValues(alpha: 0.35),
                blurRadius: 18,
                spreadRadius: 2,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              'ب',
              style: TextStyle(
                fontSize: size * 0.55,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                fontFamily: 'Cairo',
                height: 1.1,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        ShaderMask(
          blendMode: BlendMode.srcIn,
          shaderCallback: (bounds) {
            if (bounds.isEmpty || bounds.width <= 0 || bounds.height <= 0) {
              return AppColors.goldGradient.createShader(const Rect.fromLTWH(0, 0, 200, 50));
            }
            return AppColors.goldGradient.createShader(bounds);
          },
          child: const Text(
            AppStrings.appNameAr,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              fontFamily: 'Cairo',
              letterSpacing: 0.5,
            ),
          ),
        ),
        if (showEnglish) ...[
          const SizedBox(height: 2),
          const Text(
            AppStrings.appNameEn,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.goldDark,
              letterSpacing: 4.0,
            ),
          ),
        ],
        if (showSlogan) ...[
          const SizedBox(height: 8),
          const Text(
            AppStrings.appSloganAr,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              fontFamily: 'Cairo',
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}

import 'package:flutter/material.dart';

/// App color palette for بتنحل (AL7BTIN)
/// Visual identity: Clean, Modern, Premium Luxury White & Gold Theme
class AppColors {
  AppColors._();

  // Primary Gold Palette (Accents & Highlights)
  static const Color primary = Color(0xFFD4AF37);
  static const Color goldPrimary = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFF3E3A6);
  static const Color goldDark = Color(0xFFA68218);
  static const Color goldAccent = Color(0xFFE2BE45);
  static const Color goldShimmer = Color(0xFFFAF3DC);

  // White / Off-White Background & Surface Palette
  static const Color background = Color(0xFFF7F8FA);
  static const Color backgroundSecondary = Color(0xFFEFF1F5);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color card = Color(0xFFFFFFFF);

  // Borders & Dividers
  static const Color border = Color(0xFFE5E7EB);
  static const Color borderLight = Color(0xFFF0F1F4);
  static const Color borderGold = Color(0xFFE5D59A);

  // Text Colors (High contrast on White background)
  static const Color textPrimary = Color(0xFF191B21);
  static const Color textSecondary = Color(0xFF535763);
  static const Color textMuted = Color(0xFF8A8E9B);
  static const Color textGold = Color(0xFF9E7C13);
  static const Color textOnGold = Color(0xFF1A1C22);

  // Status & Feedback Colors
  static const Color success = Color(0xFF27AE60);
  static const Color error = Color(0xFFE74C3C);
  static const Color warning = Color(0xFFE67E22);
  static const Color info = Color(0xFF2980B9);

  // Gold Gradients
  static const LinearGradient goldGradient = LinearGradient(
    colors: [
      Color(0xFFF5DE88),
      Color(0xFFD4AF37),
      Color(0xFFB58E1E),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient whiteCardGradient = LinearGradient(
    colors: [
      Color(0xFFFFFFFF),
      Color(0xFFFAFBFD),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldShimmerOverlay = LinearGradient(
    colors: [
      Color(0x22D4AF37),
      Color(0x05D4AF37),
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}

import 'package:flutter/material.dart';

/// Design tokens and styling for Enterprise Desktop Admin Dashboard
class AdminTheme {
  AdminTheme._();

  // Primary Palette
  static const Color sidebarBackground = Color(0xFF0F172A); // Dark Navy / Slate 900
  static const Color sidebarHover = Color(0xFF1E293B);      // Slate 800
  static const Color sidebarActive = Color(0xFF1E293B);     // Slate 800
  static const Color sidebarBorder = Color(0xFF334155);     // Slate 700

  static const Color canvasBackground = Color(0xFFF8FAFC);  // Slate 50
  static const Color bodyBackground = Color(0xFFF8FAFC);    // Slate 50
  static const Color cardBackground = Color(0xFFFFFFFF);    // Pure White
  static const Color cardBorder = Color(0xFFE2E8F0);        // Slate 200

  // Brand Accents
  static const Color goldPrimary = Color(0xFFD4AF37);       // Royal Gold
  static const Color goldDark = Color(0xFFB8860B);          // Dark Goldenrod
  static const Color goldLight = Color(0xFFFDF8EE);         // Light Gold Tint

  // Text Hierarchy
  static const Color textPrimary = Color(0xFF0F172A);       // Slate 900
  static const Color textSecondary = Color(0xFF475569);     // Slate 600
  static const Color textMuted = Color(0xFF94A3B8);         // Slate 400

  // Semantic Status Colors
  static const Color success = Color(0xFF10B981);           // Emerald 500
  static const Color successBg = Color(0xFFECFDF5);         // Emerald 50
  static const Color error = Color(0xFFEF4444);             // Red 500
  static const Color errorBg = Color(0xFFFEF2F2);           // Red 50
  static const Color warning = Color(0xFFF59E0B);           // Amber 500
  static const Color warningBg = Color(0xFFFFFBEB);         // Amber 50
  static const Color info = Color(0xFF3B82F6);              // Blue 500
  static const Color infoBg = Color(0xFFEFF6FF);            // Blue 50
  static const Color purple = Color(0xFF8B5CF6);            // Purple 50
  static const Color purpleBg = Color(0xFFF5F3FF);          // Purple 50

  // Desktop Responsive Breakpoints & Spacing
  static const double desktopBreakpoint = 1024.0;
  static const double breakpointDesktop = 1024.0;
  static const double tabletBreakpoint = 768.0;
  static const double sidebarWidth = 260.0;
  static const double maxContentWidth = 1440.0;

  static const double spacingLg = 24.0;
  static const double spacingMd = 16.0;
  static const double spacingSm = 8.0;

  // Box Shadows
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.03),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get elevationShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.06),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static BoxDecoration get cardDecoration => BoxDecoration(
        color: cardBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
        boxShadow: cardShadow,
      );

  static ButtonStyle get primaryButtonStyle => ElevatedButton.styleFrom(
        backgroundColor: goldPrimary,
        foregroundColor: Colors.black,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      );
}

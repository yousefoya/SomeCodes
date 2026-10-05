import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Supported locales in بتنحل (AL7BTIN)
class AppLocales {
  AppLocales._();

  static const Locale arabic = Locale('ar');
  static const Locale english = Locale('en');

  static const List<Locale> supportedLocales = [
    arabic,
    english,
  ];
}

/// State notifier to manage app locale dynamically
class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(AppLocales.arabic);

  void setArabic() {
    state = AppLocales.arabic;
  }

  void setEnglish() {
    state = AppLocales.english;
  }

  void toggleLocale() {
    if (state.languageCode == 'ar') {
      state = AppLocales.english;
    } else {
      state = AppLocales.arabic;
    }
  }

  bool get isArabic => state.languageCode == 'ar';
}

/// Riverpod provider for active app locale (Arabic-first by default)
final appLocaleProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) {
  return LocaleNotifier();
});

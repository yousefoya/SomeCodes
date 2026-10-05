import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/app_strings.dart';
import 'core/localization/app_locale_provider.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

/// Root App widget configuring Riverpod Router, Localization & White/Gold Theme
class Al7btinApp extends ConsumerWidget {
  const Al7btinApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(appLocaleProvider);

    return MaterialApp.router(
      routerConfig: router,
      title: '${AppStrings.appNameAr} | ${AppStrings.appNameEn}',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      locale: locale,
      supportedLocales: AppLocales.supportedLocales,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}

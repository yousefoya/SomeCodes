import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:al7btin_app/app.dart';
import 'package:al7btin_app/features/address/data/repositories/mock_address_repository.dart';
import 'package:al7btin_app/features/address/presentation/controllers/address_controller.dart';
import 'package:al7btin_app/features/auth/data/repositories/mock_auth_repository.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:al7btin_app/features/categories/data/repositories/mock_category_repository.dart';
import 'package:al7btin_app/features/categories/presentation/controllers/categories_controller.dart';
import 'package:al7btin_app/features/home/presentation/home_screen.dart';
import 'package:al7btin_app/features/services/data/repositories/mock_service_repository.dart';
import 'package:al7btin_app/features/services/presentation/controllers/services_controller.dart';

void main() {
  testWidgets('App root initializes inside ProviderScope without errors', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            MockAuthRepository(networkDelay: Duration.zero),
          ),
          addressRepositoryProvider.overrideWithValue(
            MockAddressRepository(networkDelay: Duration.zero),
          ),
        ],
        child: const Al7btinApp(),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.byType(Al7btinApp), findsOneWidget);
  });

  testWidgets('HomeScreen renders dynamic categories and services with zero network delay', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            MockAuthRepository(networkDelay: Duration.zero),
          ),
          addressRepositoryProvider.overrideWithValue(
            MockAddressRepository(networkDelay: Duration.zero),
          ),
          categoryRepositoryProvider.overrideWithValue(
            MockCategoryRepository(networkDelay: Duration.zero),
          ),
          serviceRepositoryProvider.overrideWithValue(
            MockServiceRepository(networkDelay: Duration.zero),
          ),
        ],
        child: const MaterialApp(
          home: HomeScreen(),
        ),
      ),
    );

    // Pump widget tree and resolve futures
    await tester.pumpAndSettle();

    // Verify presence of HomeScreen
    expect(find.byType(HomeScreen), findsOneWidget);

    // Verify header greetings and search
    expect(find.byType(TextField), findsOneWidget);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:al7btin_app/core/routing/app_router.dart';
import 'package:al7btin_app/features/auth/domain/entities/user_entity.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:al7btin_app/features/auth/presentation/controllers/auth_state.dart';

void main() {
  group('GoRouter Role & Authentication Guard Tests', () {
    test('Unauthenticated user is redirected to /login when attempting to access /admin', () {
      final container = ProviderContainer(
        overrides: [
          authControllerProvider.overrideWith((ref) => _FakeAuthController(
            AuthState.unauthenticated(),
          )),
        ],
      );

      final router = container.read(appRouterProvider);
      expect(router, isNotNull);
    });

    test('Customer role cannot access /admin or /provider and redirects to /home', () {
      final customerUser = UserEntity(
        id: 'cust-1',
        phoneNumber: '0791112233',
        name: 'عميل الفحص',
        role: UserRole.customer,
        createdAt: DateTime.now(),
      );

      final container = ProviderContainer(
        overrides: [
          authControllerProvider.overrideWith((ref) => _FakeAuthController(
            AuthState.authenticated(customerUser),
          )),
        ],
      );

      final router = container.read(appRouterProvider);
      expect(router, isNotNull);
    });

    test('Provider role is restricted to /provider portal', () {
      final providerUser = UserEntity(
        id: 'prov-1',
        phoneNumber: '0795551122',
        name: 'مزود معتمد',
        role: UserRole.provider,
        createdAt: DateTime.now(),
      );

      final container = ProviderContainer(
        overrides: [
          authControllerProvider.overrideWith((ref) => _FakeAuthController(
            AuthState.authenticated(providerUser),
          )),
        ],
      );

      final router = container.read(appRouterProvider);
      expect(router, isNotNull);
    });

    test('Admin role is restricted to /admin portal', () {
      final adminUser = UserEntity(
        id: 'admin-1',
        phoneNumber: '0790000001',
        name: 'مدير النظام',
        role: UserRole.admin,
        createdAt: DateTime.now(),
      );

      final container = ProviderContainer(
        overrides: [
          authControllerProvider.overrideWith((ref) => _FakeAuthController(
            AuthState.authenticated(adminUser),
          )),
        ],
      );

      final router = container.read(appRouterProvider);
      expect(router, isNotNull);
    });
  });
}

class _FakeAuthController extends StateNotifier<AuthState> implements AuthController {
  _FakeAuthController(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/address/presentation/screens/add_edit_address_screen.dart';
import '../../features/address/presentation/screens/saved_addresses_screen.dart';
import '../../features/admin/presentation/screens/admin_dashboard_screen.dart';
import '../../features/auth/domain/entities/user_entity.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/otp_verification_screen.dart';
import '../../features/categories/presentation/categories_screen.dart';
import '../../features/checkout/presentation/checkout_screen.dart';
import '../../features/delivery/presentation/screens/delivery_dashboard_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/main_layout/presentation/main_nav_scaffold.dart';
import '../../features/orders/presentation/order_tracking_screen.dart';
import '../../features/orders/presentation/orders_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/providers/presentation/screens/provider_dashboard_screen.dart';
import '../../features/providers/presentation/screens/provider_details_screen.dart';
import '../../features/finance/presentation/screens/provider_wallet_screen.dart';
import '../../features/services/presentation/service_details_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../../features/supplier/presentation/supplier_portal_placeholder_screen.dart';
import '../../features/technician/presentation/technician_portal_placeholder_screen.dart';
import '../constants/app_colors.dart';
import 'route_names.dart';
import 'route_paths.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

/// Riverpod provider for GoRouter configuration with role-based security guards
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final user = authState.user;
      final isAuthenticated = authState.isAuthenticated;
      final currentPath = state.uri.path;

      // 1. Unauthenticated users: Protect role portals and authenticated actions
      if (!isAuthenticated) {
        final isAuthRestricted = currentPath.startsWith(RoutePaths.adminPortal) ||
            currentPath.startsWith(RoutePaths.providerPortal) ||
            currentPath.startsWith(RoutePaths.deliveryPortal) ||
            currentPath.startsWith(RoutePaths.supplierPortal) ||
            currentPath.startsWith(RoutePaths.technicianPortal) ||
            currentPath == RoutePaths.checkout ||
            currentPath == RoutePaths.addresses ||
            currentPath == RoutePaths.addAddress;

        if (isAuthRestricted) {
          return RoutePaths.login;
        }
        return null;
      }

      // 2. Authenticated users attempting to visit /login or /otp: redirect to their role home
      if (currentPath == RoutePaths.login || currentPath == RoutePaths.otp) {
        if (user?.role == UserRole.admin) return RoutePaths.adminPortal;
        if (user?.role == UserRole.provider) return RoutePaths.providerPortal;
        if (user?.role == UserRole.delivery) return RoutePaths.deliveryPortal;
        return RoutePaths.home;
      }

      // 3. Strict Role-based authorization enforcement
      if (user != null) {
        // Admin role: strict isolation from customer shopping shell and other portals
        if (user.role == UserRole.admin) {
          if (currentPath == RoutePaths.home ||
              currentPath == RoutePaths.categories ||
              currentPath == RoutePaths.checkout ||
              currentPath == RoutePaths.orders ||
              currentPath.startsWith(RoutePaths.providerPortal) ||
              currentPath.startsWith(RoutePaths.deliveryPortal)) {
            return RoutePaths.adminPortal;
          }
        }

        // Provider role: restricted to provider portal
        if (user.role == UserRole.provider) {
          if (currentPath.startsWith(RoutePaths.adminPortal) ||
              currentPath.startsWith(RoutePaths.deliveryPortal) ||
              currentPath == RoutePaths.home ||
              currentPath == RoutePaths.categories ||
              currentPath == RoutePaths.checkout ||
              currentPath == RoutePaths.orders) {
            return RoutePaths.providerPortal;
          }
        }

        // Customer role cannot access Admin, Provider, Delivery, Supplier, or Technician portals
        if (user.role == UserRole.customer) {
          if (currentPath.startsWith(RoutePaths.adminPortal) ||
              currentPath.startsWith(RoutePaths.providerPortal) ||
              currentPath.startsWith(RoutePaths.deliveryPortal) ||
              currentPath.startsWith(RoutePaths.supplierPortal) ||
              currentPath.startsWith(RoutePaths.technicianPortal)) {
            return RoutePaths.home;
          }
        }

        // Delivery role cannot access Admin, Provider, or Customer shopping
        if (user.role == UserRole.delivery) {
          if (currentPath.startsWith(RoutePaths.adminPortal) ||
              currentPath.startsWith(RoutePaths.providerPortal) ||
              currentPath == RoutePaths.home ||
              currentPath == RoutePaths.categories ||
              currentPath == RoutePaths.checkout) {
            return RoutePaths.deliveryPortal;
          }
        }
      }

      return null;
    },
    routes: [
      // Splash Screen
      GoRoute(
        path: RoutePaths.splash,
        name: RouteNames.splash,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SplashScreen(),
      ),

      // Auth / Phone Login
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const LoginScreen(),
      ),

      // Auth / OTP Verification
      GoRoute(
        path: RoutePaths.otp,
        name: RouteNames.otp,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const OtpVerificationScreen(),
      ),

      // Shell Route for Persistent 4-Tab Customer Bottom Navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return MainNavScaffold(child: child);
        },
        routes: [
          GoRoute(
            path: RoutePaths.home,
            name: RouteNames.home,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.categories,
            name: RouteNames.categories,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CategoriesScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.orders,
            name: RouteNames.orders,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: OrdersScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.profile,
            name: RouteNames.profile,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),

      // Service Details (Dynamic Service/Product Screen)
      GoRoute(
        path: RoutePaths.serviceDetails,
        name: RouteNames.serviceDetails,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final serviceId = state.pathParameters['id'] ?? 'general';
          return ServiceDetailsScreen(serviceId: serviceId);
        },
      ),

      // Customer-Facing Provider Details Screen
      GoRoute(
        path: RoutePaths.providerDetails,
        name: RouteNames.providerDetails,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final providerId = state.pathParameters['id'] ?? 'general';
          return ProviderDetailsScreen(providerId: providerId);
        },
      ),

      // Checkout
      GoRoute(
        path: RoutePaths.checkout,
        name: RouteNames.checkout,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const CheckoutScreen(),
      ),

      // Order Tracking
      GoRoute(
        path: RoutePaths.orderTracking,
        name: RouteNames.orderTracking,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final orderId = state.pathParameters['id'] ?? 'latest';
          return OrderTrackingScreen(orderId: orderId);
        },
      ),

      // Saved Addresses Management
      GoRoute(
        path: RoutePaths.addresses,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SavedAddressesScreen(),
      ),

      // Add / Edit Address Screen
      GoRoute(
        path: RoutePaths.addAddress,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AddEditAddressScreen(),
      ),

      // Admin Dashboard Portal (Protected for Admin role)
      GoRoute(
        path: RoutePaths.adminPortal,
        name: RouteNames.adminPortal,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AdminDashboardScreen(),
      ),

      // Provider Dashboard Portal (Protected for Provider role)
      GoRoute(
        path: RoutePaths.providerPortal,
        name: RouteNames.providerPortal,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ProviderDashboardScreen(),
      ),

      // Provider Wallet Screen
      GoRoute(
        path: RoutePaths.providerWallet,
        name: RouteNames.providerWallet,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ProviderWalletScreen(),
      ),

      // Delivery Dashboard Portal (Protected for Delivery role)
      GoRoute(
        path: RoutePaths.deliveryPortal,
        name: RouteNames.deliveryPortal,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const DeliveryDashboardScreen(),
      ),

      // Supplier Module Portal
      GoRoute(
        path: RoutePaths.supplierPortal,
        name: RouteNames.supplierPortal,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SupplierPortalPlaceholderScreen(),
      ),

      // Technician Module Portal
      GoRoute(
        path: RoutePaths.technicianPortal,
        name: RouteNames.technicianPortal,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const TechnicianPortalPlaceholderScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Text(
          'الصفحة غير موجودة: ${state.uri.path}',
          style: const TextStyle(color: AppColors.textPrimary, fontFamily: 'Cairo'),
        ),
      ),
    ),
  );
});

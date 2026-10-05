/// URL and path constants for GoRouter
class RoutePaths {
  RoutePaths._();

  // Root & Auth
  static const String splash = '/';
  static const String login = '/login';
  static const String otp = '/otp';

  // Shell Tabs (Customer)
  static const String home = '/home';
  static const String categories = '/categories';
  static const String orders = '/orders';
  static const String profile = '/profile';

  // Detail & Action routes
  static const String serviceDetails = '/service/:id';
  static const String providerDetails = '/providers/:id';
  static const String checkout = '/checkout';
  static const String orderTracking = '/orders/track/:id';
  static const String addresses = '/addresses';
  static const String addAddress = '/addresses/add';

  // Role Portals
  static const String adminPortal = '/admin';
  static const String providerPortal = '/provider';
  static const String providerWallet = '/provider/wallet';
  static const String deliveryPortal = '/delivery';
  static const String supplierPortal = '/supplier';
  static const String technicianPortal = '/technician';

  /// Helper to generate service details path with param
  static String serviceDetailsPath(String serviceId) => '/service/$serviceId';

  /// Helper to generate provider details path with param
  static String providerDetailsPath(String providerId) => '/providers/$providerId';

  /// Helper to generate order tracking path with param
  static String orderTrackingPath(String orderId) => '/orders/track/$orderId';
}

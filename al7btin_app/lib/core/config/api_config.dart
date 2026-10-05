import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Health check result metadata
class HealthCheckResult {
  final bool isHealthy;
  final int statusCode;
  final int latencyMs;
  final String url;
  final String? serverService;
  final String? databaseStatus;
  final String? errorMessage;

  const HealthCheckResult({
    required this.isHealthy,
    required this.statusCode,
    required this.latencyMs,
    required this.url,
    this.serverService,
    this.databaseStatus,
    this.errorMessage,
  });
}

/// Central API Configuration & Network Diagnostics for بتنحل (btin7al / AL7BTIN)
class ApiConfig {
  /// Well-known connection presets for rapid switching
  static const String lanIpBaseUrl = 'http://192.168.1.10:5000/api/v1';
  static const String adbReverseBaseUrl = 'http://localhost:5000/api/v1';
  static const String emulatorBaseUrl = 'http://10.0.2.2:5000/api/v1';

  /// Primary default base URL. Defaults to PC LAN IP so real Android devices can connect immediately.
  static const String _defaultBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: lanIpBaseUrl,
  );

  static const String _prefsKey = 'custom_api_base_url';
  static String? _overrideBaseUrl;

  /// Current active base URL
  static String get baseUrl {
    if (_overrideBaseUrl != null && _overrideBaseUrl!.trim().isNotEmpty) {
      final override = _overrideBaseUrl!.trim();
      // Guard against stale localhost overrides on real devices
      if (!override.contains('localhost') && !override.contains('127.0.0.1')) {
        return override;
      }
    }
    return _defaultBaseUrl;
  }

  /// Initialize and load any saved custom base URL from SharedPreferences
  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString(_prefsKey);

      if (savedUrl != null && savedUrl.trim().isNotEmpty) {
        final cleanUrl = savedUrl.trim();
        // If the saved URL is a stale localhost/127.0.0.1 from past development, cleanse it!
        if (cleanUrl.contains('localhost') || cleanUrl.contains('127.0.0.1') || cleanUrl.contains('0.0.0.0')) {
          debugPrint('🧹 [ApiConfig] Purging stale localhost URL from storage: $cleanUrl -> Resetting to $lanIpBaseUrl');
          await prefs.remove(_prefsKey);
          _overrideBaseUrl = null;
        } else {
          _overrideBaseUrl = cleanUrl;
        }
      }

      // Purge any stale fake dev auth tokens from previous offline mocks
      final savedToken = prefs.getString('flutter.auth_access_token') ?? prefs.getString('auth_access_token');
      if (savedToken == 'dev_token') {
        debugPrint('🧹 [ApiConfig] Purging stale mock dev_token from storage.');
        await prefs.remove('flutter.auth_access_token');
        await prefs.remove('auth_access_token');
        await prefs.remove('flutter.auth_refresh_token');
        await prefs.remove('auth_refresh_token');
        await prefs.remove('flutter.auth_cached_user');
        await prefs.remove('auth_cached_user');
      }
    } catch (e) {
      debugPrint('⚠️ [ApiConfig] Storage initialization notice: $e');
    }
    debugPrint('🌐 [ApiConfig] Active API Base URL: $baseUrl');
  }

  /// Sets a runtime custom base URL (e.g. `http://192.168.1.10:5000/api/v1`)
  static Future<void> setCustomBaseUrl(String? url) async {
    final cleanUrl = url?.trim();
    if (cleanUrl != null && cleanUrl.isNotEmpty) {
      _overrideBaseUrl = cleanUrl;
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_prefsKey, cleanUrl);
      } catch (_) {}
    } else {
      await resetToDefaultDevServer();
    }
    debugPrint('🔄 [ApiConfig] Base URL updated to: $baseUrl');
  }

  /// Resets to the verified development server LAN IP (http://192.168.1.10:5000/api/v1)
  static Future<void> resetToDefaultDevServer() async {
    _overrideBaseUrl = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefsKey);
      await prefs.setString(_prefsKey, lanIpBaseUrl);
      _overrideBaseUrl = lanIpBaseUrl;
    } catch (_) {}
    debugPrint('🔄 [ApiConfig] Reset to Default Dev Server: $baseUrl');
  }

  static const Duration timeout = Duration(seconds: 12);

  /// Performs a live health check against the active or target API URL
  static Future<HealthCheckResult> checkHealth({String? targetUrl, http.Client? client}) async {
    final base = (targetUrl != null && targetUrl.trim().isNotEmpty) ? targetUrl.trim() : baseUrl;
    final healthUri = Uri.parse(base.endsWith('/health') ? base : '$base/health');
    final httpClient = client ?? http.Client();
    final stopwatch = Stopwatch()..start();

    try {
      final response = await httpClient.get(healthUri).timeout(const Duration(seconds: 6));
      stopwatch.stop();

      if (response.statusCode == 200) {
        try {
          final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
          return HealthCheckResult(
            isHealthy: true,
            statusCode: response.statusCode,
            latencyMs: stopwatch.elapsedMilliseconds,
            url: healthUri.toString(),
            serverService: data['service']?.toString() ?? 'btin7al-api',
            databaseStatus: data['database']?.toString() ?? 'connected',
          );
        } catch (_) {
          return HealthCheckResult(
            isHealthy: true,
            statusCode: response.statusCode,
            latencyMs: stopwatch.elapsedMilliseconds,
            url: healthUri.toString(),
          );
        }
      } else {
        return HealthCheckResult(
          isHealthy: false,
          statusCode: response.statusCode,
          latencyMs: stopwatch.elapsedMilliseconds,
          url: healthUri.toString(),
          errorMessage: 'Server responded with HTTP ${response.statusCode}: ${response.body}',
        );
      }
    } catch (e) {
      stopwatch.stop();
      return HealthCheckResult(
        isHealthy: false,
        statusCode: 0,
        latencyMs: stopwatch.elapsedMilliseconds,
        url: healthUri.toString(),
        errorMessage: e.toString(),
      );
    }
  }

  /// Diagnostic logging for outbound requests
  static void logRequest(String method, Uri uri, {Map<String, String>? headers, Object? body}) {
    if (kDebugMode) {
      debugPrint('➡️ [HTTP REQ] $method $uri');
      if (body != null) {
        debugPrint('   📦 Body: $body');
      }
    }
  }

  /// Diagnostic logging for incoming responses
  static void logResponse(String method, Uri uri, int statusCode, {int? latencyMs, String? body}) {
    if (kDebugMode) {
      final latencyStr = latencyMs != null ? ' (${latencyMs}ms)' : '';
      debugPrint('⬅️ [HTTP RES $statusCode]$latencyStr $method $uri');
      if (body != null && body.length < 500) {
        debugPrint('   📄 Body: $body');
      }
    }
  }

  /// Diagnostic logging for network and server errors
  static void logError(String method, Uri uri, Object error, {StackTrace? stackTrace}) {
    debugPrint('❌ [HTTP ERR] $method $uri -> $error');
  }
}

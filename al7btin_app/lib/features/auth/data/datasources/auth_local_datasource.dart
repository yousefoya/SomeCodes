import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/user_entity.dart';

abstract class IAuthLocalDataSource {
  Future<void> saveSession({
    required UserEntity user,
    required String accessToken,
    required String refreshToken,
  });

  Future<UserEntity?> getUser();
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> updateAccessToken(String newAccessToken);
  Future<void> clearSession();
}

class AuthLocalDataSource implements IAuthLocalDataSource {
  static const _keyUser = 'auth_cached_user';
  static const _keyAccessToken = 'auth_access_token';
  static const _keyRefreshToken = 'auth_refresh_token';

  final SharedPreferences _prefs;

  AuthLocalDataSource(this._prefs);

  @override
  Future<void> saveSession({
    required UserEntity user,
    required String accessToken,
    required String refreshToken,
  }) async {
    await _prefs.setString(_keyUser, jsonEncode(user.toJson()));
    await _prefs.setString(_keyAccessToken, accessToken);
    await _prefs.setString(_keyRefreshToken, refreshToken);
  }

  @override
  Future<UserEntity?> getUser() async {
    final jsonStr = _prefs.getString(_keyUser);
    if (jsonStr == null) return null;
    try {
      final map = jsonDecode(jsonStr) as Map<String, dynamic>;
      return UserEntity.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<String?> getAccessToken() async {
    return _prefs.getString(_keyAccessToken);
  }

  @override
  Future<String?> getRefreshToken() async {
    return _prefs.getString(_keyRefreshToken);
  }

  @override
  Future<void> updateAccessToken(String newAccessToken) async {
    await _prefs.setString(_keyAccessToken, newAccessToken);
  }

  @override
  Future<void> clearSession() async {
    await _prefs.remove(_keyUser);
    await _prefs.remove(_keyAccessToken);
    await _prefs.remove(_keyRefreshToken);
  }
}

/// In-memory implementation for unit testing and instant fallback
class InMemoryAuthLocalDataSource implements IAuthLocalDataSource {
  UserEntity? _user;
  String? _accessToken;
  String? _refreshToken;

  @override
  Future<void> saveSession({
    required UserEntity user,
    required String accessToken,
    required String refreshToken,
  }) async {
    _user = user;
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  @override
  Future<UserEntity?> getUser() async => _user;

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<String?> getRefreshToken() async => _refreshToken;

  @override
  Future<void> updateAccessToken(String newAccessToken) async {
    _accessToken = newAccessToken;
  }

  @override
  Future<void> clearSession() async {
    _user = null;
    _accessToken = null;
    _refreshToken = null;
  }
}

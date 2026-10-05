/// Abstract contract for local persistent key-value storage (tokens, preferences, cache)
abstract class ILocalStorageService {
  Future<void> init();
  Future<String?> getString(String key);
  Future<void> setString(String key, String value);
  Future<bool?> getBool(String key);
  Future<void> setBool(String key, bool value);
  Future<void> remove(String key);
  Future<void> clearAll();
}

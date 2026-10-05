import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/data/datasources/auth_local_datasource.dart';
import '../../domain/entities/loyalty_entity.dart';

abstract class ILoyaltyRepository {
  Future<LoyaltyProfileEntity> getMyLoyalty();
  Future<Map<String, dynamic>> redeemReward();
  Future<void> updateAdminSettings({
    int? requiredPoints,
    double? rewardValue,
    String? titleAr,
    String? titleEn,
    bool? isActive,
  });
}

class ApiLoyaltyRepository implements ILoyaltyRepository {
  final http.Client _client;
  final IAuthLocalDataSource? _authLocalDataSource;

  ApiLoyaltyRepository({
    http.Client? client,
    IAuthLocalDataSource? authLocalDataSource,
  })  : _client = client ?? http.Client(),
        _authLocalDataSource = authLocalDataSource;

  Future<Map<String, String>> _getHeaders() async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_authLocalDataSource != null) {
      final token = await _authLocalDataSource!.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  @override
  Future<LoyaltyProfileEntity> getMyLoyalty() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/loyalty/my-points');
    try {
      final headers = await _getHeaders();
      final response = await _client.get(uri, headers: headers).timeout(ApiConfig.timeout);
      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return LoyaltyProfileEntity.fromJson(body['data'] as Map<String, dynamic>);
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تحميل بيانات نقاط الولاء.');
      }
    } catch (e) {
      if (e is Failure) rethrow;
      // Fallback default
      return const LoyaltyProfileEntity(
        points: 0,
        totalEarned: 0,
        isEligibleForReward: false,
        requiredPointsForReward: 200,
        rewardValue: 5.0,
      );
    }
  }

  @override
  Future<Map<String, dynamic>> redeemReward() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/loyalty/redeem');
    try {
      final headers = await _getHeaders();
      final response = await _client.post(uri, headers: headers).timeout(ApiConfig.timeout);
      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        return body['data'] as Map<String, dynamic>;
      } else {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل استبدال مكافأة نقاط الولاء.');
      }
    } catch (e) {
      if (e is Failure) rethrow;
      throw const NetworkFailure('تعذر الاتصال بالخادم لاستبدال المكافأة.');
    }
  }

  @override
  Future<void> updateAdminSettings({
    int? requiredPoints,
    double? rewardValue,
    String? titleAr,
    String? titleEn,
    bool? isActive,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/loyalty/admin/settings');
    try {
      final headers = await _getHeaders();
      final payload = <String, dynamic>{};
      if (requiredPoints != null) payload['requiredPoints'] = requiredPoints;
      if (rewardValue != null) payload['rewardValue'] = rewardValue;
      if (titleAr != null) payload['titleAr'] = titleAr;
      if (titleEn != null) payload['titleEn'] = titleEn;
      if (isActive != null) payload['isActive'] = isActive;

      final response = await _client
          .put(uri, headers: headers, body: jsonEncode(payload))
          .timeout(ApiConfig.timeout);

      final Map<String, dynamic> body = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode != 200 || body['success'] != true) {
        throw ServerFailure(body['error']?['message']?.toString() ?? 'فشل تحديث إعدادات برنامج الولاء.');
      }
    } catch (e) {
      if (e is Failure) rethrow;
      throw const NetworkFailure('تعذر الاتصال بالخادم.');
    }
  }
}

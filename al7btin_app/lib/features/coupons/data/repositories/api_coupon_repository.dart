import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../domain/entities/coupon_entity.dart';

class CouponValidationResult {
  final bool isValid;
  final CouponEntity? coupon;
  final double discountAmount;
  final double finalTotal;
  final String? message;

  const CouponValidationResult({
    required this.isValid,
    this.coupon,
    this.discountAmount = 0.0,
    this.finalTotal = 0.0,
    this.message,
  });
}

class ApiCouponRepository {
  final http.Client _client;

  ApiCouponRepository({http.Client? client}) : _client = client ?? http.Client();

  /// Fetch active public coupons from backend
  Future<List<CouponEntity>> fetchPublicCoupons() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/coupons');
    try {
      final response = await _client.get(uri).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        if (body['success'] == true) {
          final List<dynamic> list = (body['data']?['coupons'] as List<dynamic>?) ?? <dynamic>[];
          return list.map((item) => CouponEntity.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (e) {
      ApiConfig.logError('GET', uri, e);
    }
    return [];
  }

  /// Validate coupon with order subtotal
  Future<CouponValidationResult> validateCoupon(String code, double subtotal) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/coupons/validate');
    try {
      final response = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'code': code, 'subtotal': subtotal}),
          )
          .timeout(ApiConfig.timeout);

      final body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>;
        final couponJson = data['coupon'] as Map<String, dynamic>?;
        final discountAmount = (data['discountAmount'] as num?)?.toDouble() ?? 0.0;
        final finalTotal = (data['finalTotal'] as num?)?.toDouble() ?? subtotal;
        final message = data['message']?.toString();

        return CouponValidationResult(
          isValid: true,
          coupon: couponJson != null ? CouponEntity.fromJson(couponJson) : null,
          discountAmount: discountAmount,
          finalTotal: finalTotal,
          message: message,
        );
      } else {
        final errorMsg = body['error']?['message']?.toString() ?? 'كود الخصم غير صالح.';
        return CouponValidationResult(isValid: false, message: errorMsg);
      }
    } catch (e) {
      ApiConfig.logError('POST', uri, e);
      return const CouponValidationResult(isValid: false, message: 'تعذر التحقق من كود الخصم. يرجى فحص الاتصال بالخادم.');
    }
  }

  /// Fetch all coupons for Admin
  Future<List<CouponEntity>> fetchAdminCoupons(String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/coupons/admin');
    try {
      final response = await _client.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        if (body['success'] == true) {
          final List<dynamic> list = (body['data']?['coupons'] as List<dynamic>?) ?? <dynamic>[];
          return list.map((item) => CouponEntity.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (e) {
      ApiConfig.logError('GET', uri, e);
    }
    return [];
  }

  /// Create new coupon (Admin)
  Future<CouponEntity?> createAdminCoupon(Map<String, dynamic> data, String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/coupons/admin');
    try {
      final response = await _client
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(data),
          )
          .timeout(ApiConfig.timeout);

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        if (body['success'] == true && body['data']?['coupon'] != null) {
          return CouponEntity.fromJson(body['data']['coupon'] as Map<String, dynamic>);
        }
      }
    } catch (e) {
      ApiConfig.logError('POST', uri, e);
    }
    return null;
  }

  /// Toggle or update coupon (Admin)
  Future<CouponEntity?> updateAdminCoupon(String id, Map<String, dynamic> data, String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/coupons/admin/$id');
    try {
      final response = await _client
          .patch(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(data),
          )
          .timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        if (body['success'] == true && body['data']?['coupon'] != null) {
          return CouponEntity.fromJson(body['data']['coupon'] as Map<String, dynamic>);
        }
      }
    } catch (e) {
      ApiConfig.logError('PATCH', uri, e);
    }
    return null;
  }

  /// Delete coupon (Admin)
  Future<bool> deleteAdminCoupon(String id, String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/coupons/admin/$id');
    try {
      final response = await _client.delete(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      return response.statusCode == 200;
    } catch (e) {
      ApiConfig.logError('DELETE', uri, e);
      return false;
    }
  }
}

/// Geolocation coordinate entity
class GeoPoint {
  final double latitude;
  final double longitude;

  const GeoPoint({
    required this.latitude,
    required this.longitude,
  });

  @override
  String toString() => 'GeoPoint(lat: $latitude, lng: $longitude)';
}

/// Address details entity supporting Jordanian addresses & GPS coordinates
class UserAddress {
  final String id;
  final String title;
  final String city;
  final String area;
  final String streetAddress;
  final String? buildingNumber;
  final String? apartmentNumber;
  final String? floor;
  final String? deliveryInstructions;
  final GeoPoint location;
  final bool isDefault;

  const UserAddress({
    required this.id,
    required this.title,
    this.city = 'عمان',
    required this.area,
    required this.streetAddress,
    this.buildingNumber,
    this.apartmentNumber,
    this.floor,
    this.deliveryInstructions,
    this.location = const GeoPoint(latitude: 31.9539, longitude: 35.9106),
    this.isDefault = false,
  });

  /// Formatted full readable address description
  String get fullAddressText {
    final buffer = StringBuffer();
    buffer.write('$city - $area, $streetAddress');
    if (buildingNumber != null && buildingNumber!.isNotEmpty) {
      buffer.write('، عمارة $buildingNumber');
    }
    if (floor != null && floor!.isNotEmpty) {
      buffer.write('، طابق $floor');
    }
    if (apartmentNumber != null && apartmentNumber!.isNotEmpty) {
      buffer.write('، شقة $apartmentNumber');
    }
    return buffer.toString();
  }

  UserAddress copyWith({
    String? id,
    String? title,
    String? city,
    String? area,
    String? streetAddress,
    String? buildingNumber,
    String? apartmentNumber,
    String? floor,
    String? deliveryInstructions,
    GeoPoint? location,
    bool? isDefault,
  }) {
    return UserAddress(
      id: id ?? this.id,
      title: title ?? this.title,
      city: city ?? this.city,
      area: area ?? this.area,
      streetAddress: streetAddress ?? this.streetAddress,
      buildingNumber: buildingNumber ?? this.buildingNumber,
      apartmentNumber: apartmentNumber ?? this.apartmentNumber,
      floor: floor ?? this.floor,
      deliveryInstructions: deliveryInstructions ?? this.deliveryInstructions,
      location: location ?? this.location,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    final lat = (json['latitude'] is num)
        ? (json['latitude'] as num).toDouble()
        : double.tryParse(json['latitude']?.toString() ?? '31.9539') ?? 31.9539;
    final lng = (json['longitude'] is num)
        ? (json['longitude'] as num).toDouble()
        : double.tryParse(json['longitude']?.toString() ?? '35.9106') ?? 35.9106;

    return UserAddress(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      city: json['city']?.toString() ?? 'عمان',
      area: json['area']?.toString() ?? '',
      streetAddress: json['streetAddress']?.toString() ?? json['street_address']?.toString() ?? '',
      buildingNumber: json['buildingNumber']?.toString() ?? json['building_number']?.toString(),
      floor: json['floor']?.toString(),
      apartmentNumber: json['apartmentNumber']?.toString() ?? json['apartment_number']?.toString(),
      deliveryInstructions: json['deliveryInstructions']?.toString() ?? json['delivery_instructions']?.toString(),
      location: GeoPoint(latitude: lat, longitude: lng),
      isDefault: json['isDefault'] as bool? ?? json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'title': title,
      'city': city,
      'area': area,
      'streetAddress': streetAddress,
      'buildingNumber': buildingNumber,
      'floor': floor,
      'apartmentNumber': apartmentNumber,
      'deliveryInstructions': deliveryInstructions,
      'latitude': location.latitude,
      'longitude': location.longitude,
      'isDefault': isDefault,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserAddress &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Abstract contract for GPS and Map services
/// Decouples Flutter UI from specific map providers (Google Maps, OpenStreetMap, Mapbox, etc.)
abstract class ILocationService {
  Future<GeoPoint?> getCurrentLocation();
  Future<String?> getAddressFromCoordinates(GeoPoint point);
  Future<bool> checkPermission();
  Future<bool> requestPermission();
}

import 'package:flutter_test/flutter_test.dart';
import 'package:al7btin_app/features/services/domain/entities/dynamic_service_config_entity.dart';
import 'package:al7btin_app/features/services/domain/entities/service_entity.dart';
import 'package:al7btin_app/features/services/data/repositories/mock_service_repository.dart';

void main() {
  group('Dynamic Service Engine & Reactive Rules Tests', () {
    late MockServiceRepository mockRepo;
    late DynamicServiceConfigEntity furnitureConfig;

    setUp(() {
      mockRepo = MockServiceRepository();
      furnitureConfig = const DynamicServiceConfigEntity(
        service: ServiceEntity(
          id: 'srv_furniture_moving',
          categoryId: 'cat_moving',
          nameAr: 'خدمة نقل وتغليف الأثاث والمنازل',
          nameEn: 'Furniture Moving & Packing Service',
          descriptionAr: 'خدمة نقل أثاث احترافية بواسطة شاحنات مجهزة وعمالة مدربة',
          descriptionEn: 'Professional furniture moving service with equipped trucks and trained team',
          type: ServiceType.homeService,
          basePrice: 50.0,
          unitAr: 'نقلة',
          unitEn: 'Trip',
          isActive: true,
        ),
        fields: [
          ServiceFieldEntity(
            id: 'f_moving_type',
            key: 'moving_type',
            labelAr: 'نوع النقل',
            labelEn: 'Move Type',
            fieldType: DynamicFieldType.radio,
            isRequired: true,
            sortOrder: 1,
            options: [
              DynamicFieldOptionEntity(
                value: 'residential',
                labelAr: 'نقل أثاث منزلي كامل',
                labelEn: 'Full Residential Move',
                priceModifier: 20.0,
              ),
              DynamicFieldOptionEntity(
                value: 'single_item',
                labelAr: 'نقل قطع محددة فقط',
                labelEn: 'Single / Specific Items',
                priceModifier: 0.0,
              ),
            ],
          ),
          ServiceFieldEntity(
            id: 'f_room_count',
            key: 'room_count',
            labelAr: 'عدد الغرف المراد نقلها',
            labelEn: 'Number of Rooms',
            fieldType: DynamicFieldType.counter,
            isRequired: true,
            sortOrder: 2,
            min: 1,
            max: 10,
            step: 1,
          ),
          ServiceFieldEntity(
            id: 'f_packing_required',
            key: 'packing_required',
            labelAr: 'طلب خدمة التغليف الاحترافي',
            labelEn: 'Professional Packing Service',
            fieldType: DynamicFieldType.toggle,
            isRequired: false,
            sortOrder: 3,
          ),
          ServiceFieldEntity(
            id: 'f_has_elevator',
            key: 'has_elevator',
            labelAr: 'هل يتوفر مصعد مناسب؟',
            labelEn: 'Is elevator available?',
            fieldType: DynamicFieldType.toggle,
            isRequired: true,
            sortOrder: 4,
          ),
          ServiceFieldEntity(
            id: 'f_floor_number',
            key: 'floor_number',
            labelAr: 'رقم الطابق (في حال عدم وجود مصعد)',
            labelEn: 'Floor Number (if no elevator)',
            fieldType: DynamicFieldType.counter,
            isRequired: false,
            sortOrder: 5,
            min: 1,
            max: 12,
          ),
        ],
        rules: [
          ServiceRuleEntity(
            id: 'rule_show_floor',
            ruleName: 'إظهار الطابق عند عدم وجود مصعد',
            operator: 'AND',
            expressions: [
              RuleExpressionEntity(
                field: 'has_elevator',
                op: 'eq',
                value: false,
              ),
            ],
            actions: [
              RuleActionEntity(
                type: 'SHOW_FIELD',
                targetField: 'floor_number',
              ),
            ],
          ),
          ServiceRuleEntity(
            id: 'rule_warn_high_floor',
            ruleName: 'تنبيه طوابق عليا بدون مصعد',
            operator: 'AND',
            expressions: [
              RuleExpressionEntity(
                field: 'has_elevator',
                op: 'eq',
                value: false,
              ),
              RuleExpressionEntity(
                field: 'floor_number',
                op: 'gt',
                value: 3,
              ),
            ],
            actions: [
              RuleActionEntity(
                type: 'SHOW_ALERT',
                severity: 'warning',
                messageAr: 'نظراً لارتفاع الطابق (أكثر من 3) بدون مصعد، سيتم توفير عمال إضافيين لضمان سلامة الأثاث.',
                messageEn: 'Due to high floor (>3) without elevator, extra labor will be assigned.',
              ),
              RuleActionEntity(
                type: 'REQUIRE_CAPABILITY',
                capabilityKey: 'heavy_lifting',
              ),
            ],
          ),
        ],
      );
    });

    test('DynamicServiceConfigEntity holds typed fields and rules correctly', () {
      expect(furnitureConfig.service.id, equals('srv_furniture_moving'));
      expect(furnitureConfig.fields.length, equals(5));
      expect(furnitureConfig.rules.length, equals(2));
      expect(furnitureConfig.rules.first.actions.first.type, equals('SHOW_FIELD'));
    });

    test('DynamicServiceConfigEntity deserializes from JSON correctly', () {
      final json = {
        'service': {
          'id': 'srv_furniture_moving',
          'category_id': 'cat_moving',
          'name_ar': 'خدمة نقل وتغليف الأثاث والمنازل',
          'name_en': 'Furniture Moving & Packing Service',
          'description_ar': 'خدمة نقل أثاث احترافية',
          'description_en': 'Professional furniture moving service',
          'type': 'home_service',
          'base_price': '50.00',
          'unit_ar': 'نقلة',
          'unit_en': 'Trip',
          'is_active': true,
        },
        'fields': [
          {
            'id': 'f_rooms',
            'key': 'room_count',
            'label_ar': 'عدد الغرف',
            'label_en': 'Room Count',
            'field_type': 'counter',
            'min': 1,
            'max': 10,
            'is_required': true,
          }
        ],
        'rules': [
          {
            'id': 'r_1',
            'rule_name': 'Test Rule',
            'condition': {
              'operator': 'AND',
              'expressions': [
                {'field': 'room_count', 'op': 'gt', 'value': 2}
              ]
            },
            'actions': [
              {'type': 'SHOW_ALERT', 'message_ar': 'كبير', 'message_en': 'Large'}
            ]
          }
        ],
        'currentVersion': 2,
        'slaHours': 48,
      };

      final parsed = DynamicServiceConfigEntity.fromJson(json);

      expect(parsed.service.id, equals('srv_furniture_moving'));
      expect(parsed.fields.length, equals(1));
      expect(parsed.fields.first.key, equals('room_count'));
      expect(parsed.rules.length, equals(1));
      expect(parsed.currentVersion, equals(2));
      expect(parsed.slaHours, equals(48));
    });

    test('DynamicFieldType handles all 15 generic field types conversion correctly', () {
      final types = [
        'text',
        'textarea',
        'number',
        'counter',
        'slider',
        'select',
        'radio',
        'checkbox',
        'toggle',
        'multi_select',
        'date',
        'time',
        'datetime',
        'image_upload',
        'location',
      ];

      for (final t in types) {
        final parsedEnum = DynamicFieldType.fromString(t);
        expect(parsedEnum, isNotNull);
        expect(parsedEnum.toBackendString(), equals(t));
      }
    });

    test('MockServiceRepository calculates dynamic price with strict 0.00 JOD delivery fee', () async {
      final quote = await mockRepo.calculateDynamicPrice('srv_furniture_moving', {
        'moving_type': 'residential',
        'room_count': 3,
        'packing_required': true,
      });

      expect(quote.deliveryFee, equals(0.0)); // Strict BTIN7AL 0.00 JOD policy
      expect(quote.total, greaterThan(50.0));
      expect(quote.breakdown.isNotEmpty, isTrue);
      expect(
        quote.breakdown.any((item) => item.type == 'delivery_fee' && item.amount == 0.0),
        isTrue,
      );
    });

    test('MockServiceRepository returns full dynamic service config with fields and rules', () async {
      final config = await mockRepo.getServiceConfiguration('srv_furniture_moving');

      expect(config.service.id, equals('srv_furniture_moving'));
      expect(config.fields.isNotEmpty, isTrue);
      expect(config.rules.isNotEmpty, isTrue);
      expect(config.currentVersion, greaterThanOrEqualTo(1));
    });
  });
}

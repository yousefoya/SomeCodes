import 'dart:async';
import '../../domain/entities/service_entity.dart';
import '../../domain/entities/dynamic_service_config_entity.dart';
import '../../domain/repositories/service_repository_interface.dart';

/// Mock in-memory implementation of IServiceRepository with initial launch services
class MockServiceRepository implements IServiceRepository {
  final Duration networkDelay;

  MockServiceRepository({
    this.networkDelay = const Duration(milliseconds: 200),
  });

  final List<ServiceEntity> _mockServices = [
    // 1. Gas Cylinder (جرة غاز)
    ServiceEntity(
      id: 'srv_gas_cylinder',
      categoryId: 'cat_products',
      nameAr: 'جرة غاز',
      nameEn: 'Gas Cylinder',
      descriptionAr: 'توصيل أسطوانات وجرار الغاز للمنازل والمنشآت مع الفحص والتركيب الفوري الآمن.',
      descriptionEn: 'Gas cylinder delivery to homes and businesses with safety check and installation.',
      type: ServiceType.deliveryProduct,
      basePrice: 7.0,
      unitAr: 'جرة',
      unitEn: 'Cylinder',
      requiresQuotation: false,
      isActive: true,
      options: const [
        ServiceOptionEntity(
          id: 'opt_gas_refill',
          serviceId: 'srv_gas_cylinder',
          nameAr: 'استبدال وتوصيل أسطوانة غاز (مليانة)',
          nameEn: 'Gas Cylinder Refill & Exchange',
          optionType: 'refill',
          size: '12.5 كغ',
          price: 7.0,
          unitAr: 'جرة',
          unitEn: 'Cylinder',
          sortOrder: 1,
        ),
        ServiceOptionEntity(
          id: 'opt_gas_new',
          serviceId: 'srv_gas_cylinder',
          nameAr: 'شراء أسطوانة غاز حديد جديدة مع الغاز',
          nameEn: 'New Steel Gas Cylinder (Filled)',
          optionType: 'new_cylinder',
          size: '12.5 كغ جديدة',
          price: 45.0,
          unitAr: 'أسطوانة جديدة',
          unitEn: 'New Cylinder',
          sortOrder: 2,
        ),
        ServiceOptionEntity(
          id: 'opt_gas_hose_regulator',
          serviceId: 'srv_gas_cylinder',
          nameAr: 'منظم غاز إيطالي أصلي + بربيج أمان مع مرابط',
          nameEn: 'Italian Gas Regulator + Safety Hose',
          optionType: 'accessory',
          size: 'طقم أمان',
          price: 8.5,
          unitAr: 'طقم',
          unitEn: 'Kit',
          sortOrder: 3,
        ),
      ],
      createdAt: DateTime(2026, 1, 1),
    ),

    // 2. Drinking Water (مياه)
    ServiceEntity(
      id: 'srv_water',
      categoryId: 'cat_products',
      nameAr: 'مياه',
      nameEn: 'Drinking Water',
      descriptionAr: 'مياه شرب نقية معقمة ومتعددة الأحجام والخيارات (كاسات، قوارير 19 لتر، قناني كراتين).',
      descriptionEn: 'Pure sterilized drinking water with multiple selectable options (cups, 19L gallons, bottled packs).',
      type: ServiceType.deliveryProduct,
      basePrice: 1.5,
      unitAr: 'عبوة / قارورة',
      unitEn: 'Pack / Bottle',
      requiresQuotation: false,
      isActive: true,
      options: const [
        ServiceOptionEntity(
          id: 'opt_water_cups_200ml',
          serviceId: 'srv_water',
          nameAr: 'كاسات ماء (كرتونة 40 كأس 200 مل)',
          nameEn: 'Water Cups (Box of 40 Cups 200ml)',
          optionType: 'cups',
          size: '200 مل × 40',
          price: 2.5,
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 1,
        ),
        ServiceOptionEntity(
          id: 'opt_water_gallon_19l',
          serviceId: 'srv_water',
          nameAr: 'قوارير ماء 19 لتر (استبدال وتعبئة)',
          nameEn: 'Water Gallon 19L (Refill/Exchange)',
          optionType: 'gallons',
          size: '19 لتر',
          price: 1.5,
          unitAr: 'قارورة',
          unitEn: 'Gallon',
          sortOrder: 2,
        ),
        ServiceOptionEntity(
          id: 'opt_water_gallon_new_19l',
          serviceId: 'srv_water',
          nameAr: 'قارورة ماء جديدة معبأة (19 لتر كاملة)',
          nameEn: 'New Filled 19L Gallon with Bottle',
          optionType: 'gallons',
          size: '19 لتر جديدة',
          price: 6.0,
          unitAr: 'قارورة جديدة',
          unitEn: 'New Gallon',
          sortOrder: 3,
        ),
        ServiceOptionEntity(
          id: 'opt_water_bottles_330ml',
          serviceId: 'srv_water',
          nameAr: 'قناني ماء صغيرة (كرتونة 24 قنينة 330 مل)',
          nameEn: 'Water Bottles 330ml (Box of 24)',
          optionType: 'bottles',
          size: '330 مل × 24',
          price: 3.0,
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 4,
        ),
        ServiceOptionEntity(
          id: 'opt_water_bottles_500ml',
          serviceId: 'srv_water',
          nameAr: 'قناني ماء وسط (كرتونة 12 قنينة 500 مل)',
          nameEn: 'Water Bottles 500ml (Box of 12)',
          optionType: 'bottles',
          size: '500 مل × 12',
          price: 2.0,
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 5,
        ),
        ServiceOptionEntity(
          id: 'opt_water_bottles_1500ml',
          serviceId: 'srv_water',
          nameAr: 'قناني ماء لتر ونصف (كرتونة 6 قناني 1.5 لتر)',
          nameEn: 'Water Bottles 1.5L (Box of 6)',
          optionType: 'bottles',
          size: '1.5 لتر × 6',
          price: 2.0,
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 6,
        ),
      ],
      createdAt: DateTime(2026, 1, 1),
    ),

    // 3. Water Tank (صهاريج مياه)
    ServiceEntity(
      id: 'srv_water_tank',
      categoryId: 'cat_products',
      nameAr: 'صهاريج مياه',
      nameEn: 'Water Tanker Delivery',
      descriptionAr: 'تزويد صهاريج مياه شرب معقمة ومياه آبار بأحجام مختلفة (6م³، 10م³، 12م³) مع مضخات تفريغ حديثة.',
      descriptionEn: 'Potable water tankers in various capacities (6m³, 10m³, 12m³) with rapid delivery pump.',
      type: ServiceType.deliveryProduct,
      basePrice: 20.0,
      unitAr: 'صهريج / رد',
      unitEn: 'Tanker Load',
      requiresQuotation: false,
      isActive: true,
      options: const [
        ServiceOptionEntity(
          id: 'opt_tanker_6m3',
          serviceId: 'srv_water_tank',
          nameAr: 'صهريج مياه 6 متر مكعب (مياه شرب نقية)',
          nameEn: '6m³ Potable Drinking Water Tanker',
          optionType: 'tanker',
          size: '6 م³',
          price: 20.0,
          unitAr: 'رد',
          unitEn: 'Tanker',
          sortOrder: 1,
        ),
        ServiceOptionEntity(
          id: 'opt_tanker_10m3',
          serviceId: 'srv_water_tank',
          nameAr: 'صهريج مياه 10 متر مكعب (مياه شرب نقية)',
          nameEn: '10m³ Potable Drinking Water Tanker',
          optionType: 'tanker',
          size: '10 م³',
          price: 30.0,
          unitAr: 'رد',
          unitEn: 'Tanker',
          sortOrder: 2,
        ),
        ServiceOptionEntity(
          id: 'opt_tanker_12m3',
          serviceId: 'srv_water_tank',
          nameAr: 'صهريج مياه 12 متر مكعب (مياه شرب نقية)',
          nameEn: '12m³ Potable Drinking Water Tanker',
          optionType: 'tanker',
          size: '12 م³',
          price: 35.0,
          unitAr: 'رد',
          unitEn: 'Tanker',
          sortOrder: 3,
        ),
      ],
      createdAt: DateTime(2026, 1, 1),
    ),

    // 4. Diesel Fuel (ديزل)
    ServiceEntity(
      id: 'srv_diesel',
      categoryId: 'cat_products',
      nameAr: 'ديزل',
      nameEn: 'Diesel Fuel',
      descriptionAr: 'تزويد محروقات الديزل للتدفئة المنزلية والمؤسسات عبر صهاريج مجهزة بعدادات إلكترونية معتمدة.',
      descriptionEn: 'Diesel heating fuel delivery via certified electronically metered pump tankers.',
      type: ServiceType.deliveryProduct,
      basePrice: 0.75,
      unitAr: 'لتر',
      unitEn: 'Liter',
      requiresQuotation: false,
      isActive: true,
      options: const [
        ServiceOptionEntity(
          id: 'opt_diesel_heating',
          serviceId: 'srv_diesel',
          nameAr: 'ديزل تدفئة وتعبئة بالعداد الإلكتروني المعتمد',
          nameEn: 'Heating Diesel (Electronically Metered Pump)',
          optionType: 'metered',
          size: 'حسب العداد',
          price: 0.75,
          unitAr: 'لتر',
          unitEn: 'Liter',
          sortOrder: 1,
        ),
      ],
      createdAt: DateTime(2026, 1, 1),
    ),

    // 5. EV Charging (شحن سيارات كهرباء)
    ServiceEntity(
      id: 'srv_ev_charging',
      categoryId: 'cat_products',
      nameAr: 'شحن سيارات كهرباء',
      nameEn: 'Electric Vehicle Charging',
      descriptionAr: 'خدمة شحن سيارات كهربائية متنقلة طارئة وسريعة تصل لموقعك في أي مكان بعمان.',
      descriptionEn: 'Mobile roadside emergency boost and rapid EV charging delivered straight to your location.',
      type: ServiceType.deliveryProduct,
      basePrice: 15.0,
      unitAr: 'جلسة شحن',
      unitEn: 'Charge Session',
      requiresQuotation: false,
      isActive: true,
      options: const [
        ServiceOptionEntity(
          id: 'opt_ev_emergency_boost',
          serviceId: 'srv_ev_charging',
          nameAr: 'شحن طوارئ وإنقاذ على الطريق (15-20 دقيقة مدى)',
          nameEn: 'Roadside Emergency Rescue EV Charge',
          optionType: 'emergency',
          size: '20-30 كم مدى',
          price: 15.0,
          unitAr: 'جلسة إنقاذ',
          unitEn: 'Rescue Session',
          sortOrder: 1,
        ),
        ServiceOptionEntity(
          id: 'opt_ev_fast_charge',
          serviceId: 'srv_ev_charging',
          nameAr: 'شحن متنقل سريع للفل (تيار مستمر DC)',
          nameEn: 'Fast Mobile DC Charge (Up to 80%)',
          optionType: 'fast_dc',
          size: 'حتى 40 ك.و.س',
          price: 25.0,
          unitAr: 'شحنة كاملة',
          unitEn: 'Full Session',
          sortOrder: 2,
        ),
      ],
      createdAt: DateTime(2026, 1, 1),
    ),

    // 6. Plumbing Maintenance
    ServiceEntity(
      id: 'srv_plumbing',
      categoryId: 'cat_home_services',
      nameAr: 'صيانة وتمديدات السباكة',
      nameEn: 'Plumbing Maintenance',
      descriptionAr: 'كشف وإصلاح تسريبات المياه، تركيب المغاسل، صيانة الخزانات، والمضخات عبر سباكين محترفين.',
      descriptionEn: 'Leak detection, fixture installation, tank maintenance, and water pump repair.',
      type: ServiceType.homeService,
      basePrice: 15.0,
      unitAr: 'كشفية وزيارة',
      unitEn: 'Inspection Visit',
      requiresQuotation: true,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ),

    // 7. Electrical Maintenance
    ServiceEntity(
      id: 'srv_electrical',
      categoryId: 'cat_home_services',
      nameAr: 'صيانة وأعطال الكهرباء',
      nameEn: 'Electrical Maintenance',
      descriptionAr: 'فحص الشورت، تركيب الإنارة، تمديدات القواطع، وصيانة لوحات التوزيع مع ضمان الجودة والسلامة.',
      descriptionEn: 'Short circuit troubleshooting, lighting fixtures, circuit breakers, and electrical boards.',
      type: ServiceType.homeService,
      basePrice: 15.0,
      unitAr: 'كشفية وزيارة',
      unitEn: 'Inspection Visit',
      requiresQuotation: true,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ),

    // 8. Air Conditioning & Cooling
    ServiceEntity(
      id: 'srv_ac_cooling',
      categoryId: 'cat_home_services',
      nameAr: 'صيانة التكييف والتبريد',
      nameEn: 'Air Conditioning & Cooling',
      descriptionAr: 'غسيل المكيفات، شحن غاز الفريون، صيانة الأعطال الميكانيكية والكهربائية لوحدات التكييف.',
      descriptionEn: 'AC washing, refrigerant charging, mechanical and electrical troubleshooting.',
      type: ServiceType.homeService,
      basePrice: 20.0,
      unitAr: 'كشفية وزيارة',
      unitEn: 'Inspection Visit',
      requiresQuotation: true,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ),

    // 9. Home Cleaning & Sanitization
    ServiceEntity(
      id: 'srv_home_cleaning',
      categoryId: 'cat_home_services',
      nameAr: 'تنظيف وتعقيم المنازل',
      nameEn: 'Home Cleaning & Sanitization',
      descriptionAr: 'خدمات تنظيف شامل للمنازل والشقق والمفروشات مع التعقيم باستخدام أحدث المعدات والمواد المعتمدة.',
      descriptionEn: 'Comprehensive home, apartment, and upholstery cleaning and sanitization services.',
      type: ServiceType.homeService,
      basePrice: 25.0,
      unitAr: 'زيارة وفحص',
      unitEn: 'Visit & Inspection',
      requiresQuotation: true,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ),

    // 10. Carpentry & Furniture Assembly
    ServiceEntity(
      id: 'srv_carpentry',
      categoryId: 'cat_home_services',
      nameAr: 'نجارة وتركيب أثاث',
      nameEn: 'Carpentry & Furniture Assembly',
      descriptionAr: 'فك وتركيب غرف النوم، المطابخ، الأبواب، وصيانة الأقفال والخزائن عبر نجارين مهرة.',
      descriptionEn: 'Furniture disassembly and assembly, kitchens, doors, locks, and cabinetry repair.',
      type: ServiceType.homeService,
      basePrice: 15.0,
      unitAr: 'كشفية وزيارة',
      unitEn: 'Inspection Visit',
      requiresQuotation: true,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ),

    // 11. General Home Maintenance
    ServiceEntity(
      id: 'srv_general_maintenance',
      categoryId: 'cat_home_services',
      nameAr: 'صيانة عامة وتشطيبات',
      nameEn: 'General Home Maintenance',
      descriptionAr: 'أعمال الدهان، البلاط، الجبس بورد، وعلاج الرطوبة والتصدعات مع ضمان جودة التنفيذ.',
      descriptionEn: 'Painting, tiling, drywall repair, and general architectural home finishing.',
      type: ServiceType.homeService,
      basePrice: 18.0,
      unitAr: 'معاينة وفحص',
      unitEn: 'Inspection Visit',
      requiresQuotation: true,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ),
  ];

  @override
  Future<List<ServiceEntity>> getServices({String? categoryId, bool includeInactive = false}) async {
    await Future<void>.delayed(networkDelay);
    var list = _mockServices.where((s) => includeInactive || s.isActive);
    if (categoryId != null && categoryId.isNotEmpty) {
      list = list.where((s) => s.categoryId == categoryId);
    }
    return list.toList();
  }

  @override
  Future<ServiceEntity?> getServiceById(String id) async {
    await Future<void>.delayed(networkDelay);
    try {
      return _mockServices.firstWhere((s) => s.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<List<ServiceEntity>> searchServices(String query) async {
    await Future<void>.delayed(networkDelay);
    final cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.isEmpty) {
      return _mockServices.where((s) => s.isActive).toList();
    }

    return _mockServices.where((s) {
      final matchesAr = s.nameAr.toLowerCase().contains(cleanQuery) ||
          s.descriptionAr.toLowerCase().contains(cleanQuery);
      final matchesEn = s.nameEn.toLowerCase().contains(cleanQuery) ||
          s.descriptionEn.toLowerCase().contains(cleanQuery);
      return s.isActive && (matchesAr || matchesEn);
    }).toList();
  }

  @override
  Future<ServiceEntity> addService(ServiceEntity service) async {
    await Future<void>.delayed(networkDelay);
    final newService = service.copyWith(
      id: service.id.isEmpty ? 'srv_${DateTime.now().millisecondsSinceEpoch}' : service.id,
      createdAt: DateTime.now(),
    );
    _mockServices.insert(0, newService);
    return newService;
  }

  @override
  Future<ServiceEntity> updateService(ServiceEntity service) async {
    await Future<void>.delayed(networkDelay);
    final index = _mockServices.indexWhere((s) => s.id == service.id);
    if (index != -1) {
      _mockServices[index] = service;
      return service;
    }
    _mockServices.add(service);
    return service;
  }

  @override
  Future<void> deleteService(String serviceId) async {
    await Future<void>.delayed(networkDelay);
    _mockServices.removeWhere((s) => s.id == serviceId);
  }

  @override
  Future<ServiceOptionEntity> addServiceOption(String serviceId, ServiceOptionEntity option) async {
    await Future<void>.delayed(networkDelay);
    final srvIndex = _mockServices.indexWhere((s) => s.id == serviceId);
    if (srvIndex != -1) {
      final srv = _mockServices[srvIndex];
      final newOpt = option.copyWith(
        id: option.id.isEmpty ? 'opt_${DateTime.now().millisecondsSinceEpoch}' : option.id,
        serviceId: serviceId,
        createdAt: DateTime.now(),
      );
      final updatedOptions = List<ServiceOptionEntity>.from(srv.options)..add(newOpt);
      _mockServices[srvIndex] = srv.copyWith(options: updatedOptions);
      return newOpt;
    }
    return option;
  }

  @override
  Future<ServiceOptionEntity> updateServiceOption(ServiceOptionEntity option) async {
    await Future<void>.delayed(networkDelay);
    for (int i = 0; i < _mockServices.length; i++) {
      final srv = _mockServices[i];
      final optIndex = srv.options.indexWhere((o) => o.id == option.id);
      if (optIndex != -1) {
        final updatedOptions = List<ServiceOptionEntity>.from(srv.options);
        updatedOptions[optIndex] = option;
        _mockServices[i] = srv.copyWith(options: updatedOptions);
        return option;
      }
    }
    return option;
  }

  @override
  Future<void> deleteServiceOption(String optionId) async {
    await Future<void>.delayed(networkDelay);
    for (int i = 0; i < _mockServices.length; i++) {
      final srv = _mockServices[i];
      final updatedOptions = srv.options.where((o) => o.id != optionId).toList();
      if (updatedOptions.length != srv.options.length) {
        _mockServices[i] = srv.copyWith(options: updatedOptions);
        break;
      }
    }
  }

  @override
  Future<DynamicServiceConfigEntity> getServiceConfiguration(String id) async {
    await Future<void>.delayed(networkDelay);
    final srv = _mockServices.firstWhere(
      (s) => s.id == id,
      orElse: () => ServiceEntity(
        id: id,
        categoryId: 'cat_moving',
        nameAr: 'خدمة نقل الأثاث والمنازل',
        nameEn: 'Furniture Moving Service',
        descriptionAr: 'خدمة نقل أثاث احترافية',
        descriptionEn: 'Professional furniture moving service',
        type: ServiceType.homeService,
        basePrice: 50.0,
        unitAr: 'نقلة',
        unitEn: 'Trip',
        isActive: true,
      ),
    );

    if (id == 'srv_furniture_moving') {
      return DynamicServiceConfigEntity(
        service: srv,
        currentVersion: 1,
        slaHours: 24,
        fields: const [
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
        ],
        rules: const [
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
        ],
      );
    }

    return DynamicServiceConfigEntity(
      service: srv,
      fields: const [],
      rules: const [],
      pricingRules: const [],
      options: srv.options,
    );
  }

  @override
  Future<DynamicPriceQuoteEntity> calculateDynamicPrice(
    String id,
    Map<String, dynamic> answers, {
    String? optionId,
    int quantity = 1,
    String? couponCode,
  }) async {
    await Future<void>.delayed(networkDelay);
    final srv = _mockServices.firstWhere(
      (s) => s.id == id,
      orElse: () => ServiceEntity(
        id: id,
        categoryId: 'cat_moving',
        nameAr: 'خدمة نقل وتغليف الأثاث والمنازل',
        nameEn: 'Furniture Moving & Packing Service',
        descriptionAr: 'خدمة نقل أثاث احترافية',
        descriptionEn: 'Professional furniture moving service',
        type: ServiceType.homeService,
        basePrice: 50.0,
        unitAr: 'نقلة',
        unitEn: 'Trip',
        isActive: true,
      ),
    );

    double total = srv.basePrice;
    final breakdown = <PriceBreakdownItem>[
      PriceBreakdownItem(
        titleAr: 'السعر الأساسي للخدمة',
        titleEn: 'Base Service Price',
        amount: srv.basePrice,
        type: 'base',
      ),
    ];

    if (answers['moving_type'] == 'residential') {
      total += 20.0;
      breakdown.add(const PriceBreakdownItem(
        titleAr: 'إضافة نقل سكني كامل',
        titleEn: 'Full Residential Move',
        amount: 20.0,
        type: 'addon',
      ));
    }

    if (answers['room_count'] != null) {
      final rooms = (answers['room_count'] as num).toInt();
      if (rooms > 1) {
        final extra = (rooms - 1) * 15.0;
        total += extra;
        breakdown.add(PriceBreakdownItem(
          titleAr: 'غرف إضافية ($rooms غرف)',
          titleEn: 'Additional Rooms ($rooms)',
          amount: extra,
          type: 'addon',
        ));
      }
    }

    if (answers['packing_required'] == true) {
      total += 25.0;
      breakdown.add(const PriceBreakdownItem(
        titleAr: 'تغليف احترافي شامل',
        titleEn: 'Professional Packing',
        amount: 25.0,
        type: 'addon',
      ));
    }

    // Always 0.00 JOD delivery fee
    breakdown.add(const PriceBreakdownItem(
      titleAr: 'رسوم التوصيل والانتقال (مجاني)',
      titleEn: 'Delivery / Travel Fee (Free)',
      amount: 0.0,
      type: 'delivery_fee',
    ));

    return DynamicPriceQuoteEntity(
      basePrice: srv.basePrice,
      subtotal: total,
      deliveryFee: 0.0,
      total: total,
      breakdown: breakdown,
      serviceVersion: 1,
    );
  }
}

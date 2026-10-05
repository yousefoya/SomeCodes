import 'service_entity.dart';

/// Supported generic field types for dynamic metadata-driven forms
enum DynamicFieldType {
  text,
  textarea,
  number,
  counter,
  slider,
  select,
  radio,
  checkbox,
  toggle,
  multiSelect,
  date,
  time,
  datetime,
  imageUpload,
  location;

  static DynamicFieldType fromString(String? type) {
    switch (type) {
      case 'textarea':
        return DynamicFieldType.textarea;
      case 'number':
        return DynamicFieldType.number;
      case 'counter':
        return DynamicFieldType.counter;
      case 'slider':
        return DynamicFieldType.slider;
      case 'select':
        return DynamicFieldType.select;
      case 'radio':
        return DynamicFieldType.radio;
      case 'checkbox':
        return DynamicFieldType.checkbox;
      case 'toggle':
        return DynamicFieldType.toggle;
      case 'multi_select':
      case 'multiSelect':
        return DynamicFieldType.multiSelect;
      case 'date':
        return DynamicFieldType.date;
      case 'time':
        return DynamicFieldType.time;
      case 'datetime':
        return DynamicFieldType.datetime;
      case 'image_upload':
      case 'imageUpload':
        return DynamicFieldType.imageUpload;
      case 'location':
        return DynamicFieldType.location;
      case 'text':
      default:
        return DynamicFieldType.text;
    }
  }

  String toBackendString() {
    switch (this) {
      case DynamicFieldType.textarea:
        return 'textarea';
      case DynamicFieldType.number:
        return 'number';
      case DynamicFieldType.counter:
        return 'counter';
      case DynamicFieldType.slider:
        return 'slider';
      case DynamicFieldType.select:
        return 'select';
      case DynamicFieldType.radio:
        return 'radio';
      case DynamicFieldType.checkbox:
        return 'checkbox';
      case DynamicFieldType.toggle:
        return 'toggle';
      case DynamicFieldType.multiSelect:
        return 'multi_select';
      case DynamicFieldType.date:
        return 'date';
      case DynamicFieldType.time:
        return 'time';
      case DynamicFieldType.datetime:
        return 'datetime';
      case DynamicFieldType.imageUpload:
        return 'image_upload';
      case DynamicFieldType.location:
        return 'location';
      case DynamicFieldType.text:
        return 'text';
    }
  }
}

/// Option item for select, radio, and multi_select field types
class DynamicFieldOptionEntity {
  final String labelAr;
  final String labelEn;
  final dynamic value;
  final double priceModifier;
  final bool isDefault;

  const DynamicFieldOptionEntity({
    required this.labelAr,
    required this.labelEn,
    required this.value,
    this.priceModifier = 0.0,
    this.isDefault = false,
  });

  factory DynamicFieldOptionEntity.fromJson(Map<String, dynamic> json) {
    return DynamicFieldOptionEntity(
      labelAr: json['labelAr'] as String? ?? json['label_ar'] as String? ?? '',
      labelEn: json['labelEn'] as String? ?? json['label_en'] as String? ?? '',
      value: json['value'],
      priceModifier: (json['priceModifier'] is num)
          ? (json['priceModifier'] as num).toDouble()
          : (json['price_modifier'] is num)
              ? (json['price_modifier'] as num).toDouble()
              : double.tryParse(json['priceModifier']?.toString() ?? '0.0') ?? 0.0,
      isDefault: json['isDefault'] as bool? ?? json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'labelAr': labelAr,
      'labelEn': labelEn,
      'value': value,
      'priceModifier': priceModifier,
      'isDefault': isDefault,
    };
  }
}

/// Metadata definition of an input field rendered dynamically in Flutter
class ServiceFieldEntity {
  final String id;
  final String key;
  final String labelAr;
  final String labelEn;
  final DynamicFieldType fieldType;
  final String? descriptionAr;
  final String? descriptionEn;
  final String? placeholderAr;
  final String? placeholderEn;
  final dynamic defaultValue;
  final double? min;
  final double? max;
  final double? step;
  final String? unitAr;
  final String? unitEn;
  final List<DynamicFieldOptionEntity> options;
  final Map<String, dynamic> validationRules;
  final int sortOrder;
  final bool isRequired;
  final bool isActive;

  const ServiceFieldEntity({
    required this.id,
    required this.key,
    required this.labelAr,
    required this.labelEn,
    required this.fieldType,
    this.descriptionAr,
    this.descriptionEn,
    this.placeholderAr,
    this.placeholderEn,
    this.defaultValue,
    this.min,
    this.max,
    this.step,
    this.unitAr,
    this.unitEn,
    this.options = const [],
    this.validationRules = const {},
    this.sortOrder = 0,
    this.isRequired = false,
    this.isActive = true,
  });

  factory ServiceFieldEntity.fromJson(Map<String, dynamic> json) {
    List<DynamicFieldOptionEntity> parsedOptions = [];
    if (json['options'] != null && json['options'] is List) {
      parsedOptions = (json['options'] as List)
          .map((opt) => DynamicFieldOptionEntity.fromJson(opt as Map<String, dynamic>))
          .toList();
    }

    return ServiceFieldEntity(
      id: json['id'] as String? ?? '',
      key: json['key'] as String? ?? '',
      labelAr: json['labelAr'] as String? ?? json['label_ar'] as String? ?? '',
      labelEn: json['labelEn'] as String? ?? json['label_en'] as String? ?? '',
      fieldType: DynamicFieldType.fromString(json['fieldType'] as String? ?? json['field_type'] as String?),
      descriptionAr: json['descriptionAr'] as String? ?? json['description_ar'] as String?,
      descriptionEn: json['descriptionEn'] as String? ?? json['description_en'] as String?,
      placeholderAr: json['placeholderAr'] as String? ?? json['placeholder_ar'] as String?,
      placeholderEn: json['placeholderEn'] as String? ?? json['placeholder_en'] as String?,
      defaultValue: json['defaultValue'] ?? json['default_value'],
      min: (json['min'] is num) ? (json['min'] as num).toDouble() : double.tryParse(json['min']?.toString() ?? ''),
      max: (json['max'] is num) ? (json['max'] as num).toDouble() : double.tryParse(json['max']?.toString() ?? ''),
      step: (json['step'] is num) ? (json['step'] as num).toDouble() : double.tryParse(json['step']?.toString() ?? ''),
      unitAr: json['unitAr'] as String? ?? json['unit_ar'] as String?,
      unitEn: json['unitEn'] as String? ?? json['unit_en'] as String?,
      options: parsedOptions,
      validationRules: (json['validationRules'] as Map<String, dynamic>?) ??
          (json['validation_rules'] as Map<String, dynamic>?) ??
          {},
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? (json['sort_order'] as num?)?.toInt() ?? 0,
      isRequired: json['isRequired'] as bool? ?? json['is_required'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
    );
  }
}

/// AST expression for declarative rules
class RuleExpressionEntity {
  final String field;
  final String op;
  final dynamic value;

  const RuleExpressionEntity({
    required this.field,
    required this.op,
    this.value,
  });

  factory RuleExpressionEntity.fromJson(Map<String, dynamic> json) {
    return RuleExpressionEntity(
      field: json['field'] as String? ?? '',
      op: json['op'] as String? ?? 'eq',
      value: json['value'],
    );
  }
}

/// Rule action to apply when condition matches
class RuleActionEntity {
  final String type;
  final String? targetField;
  final String? messageAr;
  final String? messageEn;
  final String? severity;
  final String? capabilityKey;

  const RuleActionEntity({
    required this.type,
    this.targetField,
    this.messageAr,
    this.messageEn,
    this.severity,
    this.capabilityKey,
  });

  factory RuleActionEntity.fromJson(Map<String, dynamic> json) {
    return RuleActionEntity(
      type: json['type'] as String? ?? 'SHOW_ALERT',
      targetField: json['targetField'] as String? ?? json['target_field'] as String?,
      messageAr: json['messageAr'] as String? ?? json['message_ar'] as String?,
      messageEn: json['messageEn'] as String? ?? json['message_en'] as String?,
      severity: json['severity'] as String? ?? 'info',
      capabilityKey: json['capabilityKey'] as String? ?? json['capability_key'] as String?,
    );
  }
}

/// Declarative Rule Entity
class ServiceRuleEntity {
  final String id;
  final String ruleName;
  final String? description;
  final String operator;
  final List<RuleExpressionEntity> expressions;
  final List<RuleActionEntity> actions;
  final int priority;
  final bool isActive;

  const ServiceRuleEntity({
    required this.id,
    required this.ruleName,
    this.description,
    this.operator = 'AND',
    this.expressions = const [],
    this.actions = const [],
    this.priority = 0,
    this.isActive = true,
  });

  factory ServiceRuleEntity.fromJson(Map<String, dynamic> json) {
    final cond = (json['condition'] as Map<String, dynamic>?) ?? {};
    final op = cond['operator'] as String? ?? 'AND';

    List<RuleExpressionEntity> exprs = [];
    if (cond['expressions'] != null && cond['expressions'] is List) {
      exprs = (cond['expressions'] as List)
          .map((e) => RuleExpressionEntity.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    List<RuleActionEntity> acts = [];
    if (json['actions'] != null && json['actions'] is List) {
      acts = (json['actions'] as List)
          .map((a) => RuleActionEntity.fromJson(a as Map<String, dynamic>))
          .toList();
    }

    return ServiceRuleEntity(
      id: json['id'] as String? ?? '',
      ruleName: json['ruleName'] as String? ?? json['rule_name'] as String? ?? '',
      description: json['description'] as String?,
      operator: op,
      expressions: exprs,
      actions: acts,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
    );
  }
}

/// Complete Dynamic Service Configuration returned by GET /services/:id/configuration
class DynamicServiceConfigEntity {
  final ServiceEntity service;
  final List<ServiceFieldEntity> fields;
  final List<ServiceRuleEntity> rules;
  final List<Map<String, dynamic>> pricingRules;
  final List<ServiceOptionEntity> options;
  final int currentVersion;
  final int slaHours;
  final double? minOrderValue;
  final double? maxOrderValue;

  const DynamicServiceConfigEntity({
    required this.service,
    this.fields = const [],
    this.rules = const [],
    this.pricingRules = const [],
    this.options = const [],
    this.currentVersion = 1,
    this.slaHours = 24,
    this.minOrderValue,
    this.maxOrderValue,
  });

  factory DynamicServiceConfigEntity.fromJson(Map<String, dynamic> json) {
    final srvJson = (json['service'] as Map<String, dynamic>?) ?? json;
    final service = ServiceEntity.fromJson(srvJson);

    List<ServiceFieldEntity> fields = [];
    if (json['fields'] != null && json['fields'] is List) {
      fields = (json['fields'] as List)
          .map((f) => ServiceFieldEntity.fromJson(f as Map<String, dynamic>))
          .toList();
      fields.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    }

    List<ServiceRuleEntity> rules = [];
    if (json['rules'] != null && json['rules'] is List) {
      rules = (json['rules'] as List)
          .map((r) => ServiceRuleEntity.fromJson(r as Map<String, dynamic>))
          .toList();
      rules.sort((a, b) => a.priority.compareTo(b.priority));
    }

    List<ServiceOptionEntity> options = [];
    if (json['options'] != null && json['options'] is List) {
      options = (json['options'] as List)
          .map((o) => ServiceOptionEntity.fromJson(o as Map<String, dynamic>))
          .toList();
    }

    return DynamicServiceConfigEntity(
      service: service,
      fields: fields,
      rules: rules,
      pricingRules: (json['pricingRules'] as List<dynamic>?)?.map((p) => p as Map<String, dynamic>).toList() ?? [],
      options: options,
      currentVersion: (json['currentVersion'] as num?)?.toInt() ?? service.options.length,
      slaHours: (json['slaHours'] as num?)?.toInt() ?? 24,
      minOrderValue: (json['minOrderValue'] is num)
          ? (json['minOrderValue'] as num).toDouble()
          : double.tryParse(json['minOrderValue']?.toString() ?? ''),
      maxOrderValue: (json['maxOrderValue'] is num)
          ? (json['maxOrderValue'] as num).toDouble()
          : double.tryParse(json['maxOrderValue']?.toString() ?? ''),
    );
  }
}

/// Itemized breakdown line item
class PriceBreakdownItem {
  final String titleAr;
  final String titleEn;
  final double amount;
  final String type;

  const PriceBreakdownItem({
    required this.titleAr,
    required this.titleEn,
    required this.amount,
    required this.type,
  });

  factory PriceBreakdownItem.fromJson(Map<String, dynamic> json) {
    return PriceBreakdownItem(
      titleAr: json['titleAr'] as String? ?? json['title_ar'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? json['title_en'] as String? ?? '',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0.0') ?? 0.0,
      type: json['type'] as String? ?? 'addon',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'titleAr': titleAr,
      'titleEn': titleEn,
      'amount': amount,
      'type': type,
    };
  }
}

/// Authoritative Server Price Quote returned by POST /services/:id/calculate-price
class DynamicPriceQuoteEntity {
  final double basePrice;
  final double subtotal;
  final double deliveryFee;
  final double total;
  final double discount;
  final List<PriceBreakdownItem> breakdown;
  final int serviceVersion;
  final List<String> appliedRules;

  const DynamicPriceQuoteEntity({
    required this.basePrice,
    required this.subtotal,
    this.deliveryFee = 0.0,
    required this.total,
    this.discount = 0.0,
    this.breakdown = const [],
    this.serviceVersion = 1,
    this.appliedRules = const [],
  });

  factory DynamicPriceQuoteEntity.fromJson(Map<String, dynamic> json) {
    List<PriceBreakdownItem> items = [];
    if (json['breakdown'] != null && json['breakdown'] is List) {
      items = (json['breakdown'] as List)
          .map((b) => PriceBreakdownItem.fromJson(b as Map<String, dynamic>))
          .toList();
    }

    return DynamicPriceQuoteEntity(
      basePrice: (json['basePrice'] is num)
          ? (json['basePrice'] as num).toDouble()
          : double.tryParse(json['basePrice']?.toString() ?? '0.0') ?? 0.0,
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse(json['subtotal']?.toString() ?? '0.0') ?? 0.0,
      deliveryFee: (json['deliveryFee'] is num)
          ? (json['deliveryFee'] as num).toDouble()
          : double.tryParse(json['deliveryFee']?.toString() ?? '0.0') ?? 0.0,
      total: (json['total'] is num)
          ? (json['total'] as num).toDouble()
          : double.tryParse(json['total']?.toString() ?? '0.0') ?? 0.0,
      discount: (json['discount'] is num)
          ? (json['discount'] as num).toDouble()
          : double.tryParse(json['discount']?.toString() ?? '0.0') ?? 0.0,
      breakdown: items,
      serviceVersion: (json['serviceVersion'] as num?)?.toInt() ?? 1,
      appliedRules: (json['appliedRules'] as List<dynamic>?)?.map((r) => r.toString()).toList() ?? [],
    );
  }
}

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/dynamic_service_config_entity.dart';
import 'services_controller.dart';

/// State of dynamic service form, reactive rules, and authoritative server price quote
class DynamicServiceState {
  final AsyncValue<DynamicServiceConfigEntity> configAsync;
  final Map<String, dynamic> answers;
  final Set<String> visibleFields;
  final Set<String> requiredFields;
  final List<Map<String, dynamic>> activeAlerts;
  final Set<String> requiredCapabilities;
  final DynamicPriceQuoteEntity? quote;
  final bool isCalculatingPrice;
  final String? calculationError;

  const DynamicServiceState({
    required this.configAsync,
    this.answers = const {},
    this.visibleFields = const {},
    this.requiredFields = const {},
    this.activeAlerts = const [],
    this.requiredCapabilities = const {},
    this.quote,
    this.isCalculatingPrice = false,
    this.calculationError,
  });

  DynamicServiceState copyWith({
    AsyncValue<DynamicServiceConfigEntity>? configAsync,
    Map<String, dynamic>? answers,
    Set<String>? visibleFields,
    Set<String>? requiredFields,
    List<Map<String, dynamic>>? activeAlerts,
    Set<String>? requiredCapabilities,
    DynamicPriceQuoteEntity? quote,
    bool? isCalculatingPrice,
    String? calculationError,
  }) {
    return DynamicServiceState(
      configAsync: configAsync ?? this.configAsync,
      answers: answers ?? this.answers,
      visibleFields: visibleFields ?? this.visibleFields,
      requiredFields: requiredFields ?? this.requiredFields,
      activeAlerts: activeAlerts ?? this.activeAlerts,
      requiredCapabilities: requiredCapabilities ?? this.requiredCapabilities,
      quote: quote ?? this.quote,
      isCalculatingPrice: isCalculatingPrice ?? this.isCalculatingPrice,
      calculationError: calculationError ?? this.calculationError,
    );
  }
}

/// Dynamic Service Controller with reactive AST rule evaluation and debounced server pricing
class DynamicServiceNotifier extends FamilyNotifier<DynamicServiceState, String> {
  Timer? _debounceTimer;

  @override
  DynamicServiceState build(String arg) {
    _loadConfiguration();
    return const DynamicServiceState(
      configAsync: AsyncValue.loading(),
    );
  }

  Future<void> _loadConfiguration() async {
    final repository = ref.read(serviceRepositoryProvider);
    state = state.copyWith(configAsync: const AsyncValue.loading());

    try {
      final config = await repository.getServiceConfiguration(arg);

      // Initialize default answers
      final initAnswers = <String, dynamic>{};
      final initialVisible = <String>{};
      final initialRequired = <String>{};

      for (final field in config.fields) {
        initialVisible.add(field.key);
        if (field.isRequired) {
          initialRequired.add(field.key);
        }

        if (field.defaultValue != null) {
          initAnswers[field.key] = field.defaultValue;
        } else if (field.fieldType == DynamicFieldType.counter ||
            field.fieldType == DynamicFieldType.number) {
          initAnswers[field.key] = field.min?.toInt() ?? 1;
        } else if (field.fieldType == DynamicFieldType.toggle ||
            field.fieldType == DynamicFieldType.checkbox) {
          initAnswers[field.key] = false;
        } else if (field.fieldType == DynamicFieldType.select ||
            field.fieldType == DynamicFieldType.radio) {
          if (field.options.isNotEmpty) {
            initAnswers[field.key] = field.options.first.value;
          }
        }
      }

      state = state.copyWith(
        configAsync: AsyncValue.data(config),
        answers: initAnswers,
        visibleFields: initialVisible,
        requiredFields: initialRequired,
      );

      _evaluateReactiveRules(config, initAnswers);
      _requestServerPriceCalculation(initAnswers);
    } catch (e, st) {
      state = state.copyWith(configAsync: AsyncValue.error(e, st));
    }
  }

  /// Update single field answer, evaluate reactive rules, and request debounced price calculation
  void updateAnswer(String key, dynamic value) {
    final updated = Map<String, dynamic>.from(state.answers);
    updated[key] = value;

    final config = state.configAsync.valueOrNull;
    if (config != null) {
      _evaluateReactiveRules(config, updated);
    }

    state = state.copyWith(answers: updated);
    _debouncedCalculatePrice(updated);
  }

  /// Client-side Reactive Rule Evaluator (AST evaluation for instant UX)
  void _evaluateReactiveRules(
    DynamicServiceConfigEntity config,
    Map<String, dynamic> answers,
  ) {
    final visible = <String>{for (var f in config.fields) f.key};
    final required = <String>{for (var f in config.fields) if (f.isRequired) f.key};
    final alerts = <Map<String, dynamic>>[];
    final capabilities = <String>{};

    for (final rule in config.rules) {
      if (!rule.isActive) continue;

      final isAnd = rule.operator.toUpperCase() == 'AND';
      var ruleMatches = isAnd;

      if (rule.expressions.isNotEmpty) {
        final results = <bool>[];
        for (final expr in rule.expressions) {
          final actualValue = answers[expr.field];
          final targetValue = expr.value;

          bool match = false;
          switch (expr.op) {
            case 'eq':
              if (actualValue == targetValue) {
                match = true;
              } else if (targetValue is bool) {
                match = (actualValue == true) == targetValue;
              } else if (targetValue is num && actualValue is num) {
                match = actualValue == targetValue;
              } else {
                match = actualValue.toString() == targetValue.toString();
              }
              break;
            case 'neq':
              match = actualValue != targetValue;
              break;
            case 'gt':
              if (actualValue is num && targetValue is num) {
                match = actualValue > targetValue;
              } else if (actualValue != null && targetValue != null) {
                final a = num.tryParse(actualValue.toString());
                final b = num.tryParse(targetValue.toString());
                match = a != null && b != null && a > b;
              }
              break;
            case 'gte':
              if (actualValue is num && targetValue is num) {
                match = actualValue >= targetValue;
              } else if (actualValue != null && targetValue != null) {
                final a = num.tryParse(actualValue.toString());
                final b = num.tryParse(targetValue.toString());
                match = a != null && b != null && a >= b;
              }
              break;
            case 'lt':
              if (actualValue is num && targetValue is num) {
                match = actualValue < targetValue;
              } else if (actualValue != null && targetValue != null) {
                final a = num.tryParse(actualValue.toString());
                final b = num.tryParse(targetValue.toString());
                match = a != null && b != null && a < b;
              }
              break;
            case 'lte':
              if (actualValue is num && targetValue is num) {
                match = actualValue <= targetValue;
              } else if (actualValue != null && targetValue != null) {
                final a = num.tryParse(actualValue.toString());
                final b = num.tryParse(targetValue.toString());
                match = a != null && b != null && a <= b;
              }
              break;
            case 'is_empty':
              match = actualValue == null || actualValue.toString().trim().isEmpty;
              break;
            case 'is_not_empty':
              match = actualValue != null && actualValue.toString().trim().isNotEmpty;
              break;
            default:
              match = false;
          }
          results.add(match);
        }

        ruleMatches = isAnd ? results.every((r) => r) : results.any((r) => r);
      }

      if (ruleMatches) {
        for (final action in rule.actions) {
          switch (action.type) {
            case 'SHOW_FIELD':
              if (action.targetField != null) visible.add(action.targetField!);
              break;
            case 'HIDE_FIELD':
              if (action.targetField != null) visible.remove(action.targetField!);
              break;
            case 'REQUIRE_FIELD':
              if (action.targetField != null) required.add(action.targetField!);
              break;
            case 'UNREQUIRE_FIELD':
              if (action.targetField != null) required.remove(action.targetField!);
              break;
            case 'SHOW_ALERT':
              alerts.add({
                'messageAr': action.messageAr ?? '',
                'messageEn': action.messageEn ?? '',
                'severity': action.severity ?? 'warning',
              });
              break;
            case 'REQUIRE_CAPABILITY':
              if (action.capabilityKey != null) {
                capabilities.add(action.capabilityKey!);
              }
              break;
          }
        }
      }
    }

    state = state.copyWith(
      visibleFields: visible,
      requiredFields: required,
      activeAlerts: alerts,
      requiredCapabilities: capabilities,
    );
  }

  void _debouncedCalculatePrice(Map<String, dynamic> answers) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _requestServerPriceCalculation(answers);
    });
  }

  Future<void> _requestServerPriceCalculation(Map<String, dynamic> answers) async {
    final repository = ref.read(serviceRepositoryProvider);
    state = state.copyWith(isCalculatingPrice: true, calculationError: null);

    try {
      final quote = await repository.calculateDynamicPrice(arg, answers);
      state = state.copyWith(
        quote: quote,
        isCalculatingPrice: false,
      );
    } catch (e) {
      state = state.copyWith(
        isCalculatingPrice: false,
        calculationError: e.toString(),
      );
    }
  }

  /// Validate that all visible and required fields have valid non-empty inputs
  bool validateForm(bool isAr) {
    final config = state.configAsync.valueOrNull;
    if (config == null) return false;

    for (final field in config.fields) {
      if (state.visibleFields.contains(field.key) && state.requiredFields.contains(field.key)) {
        final val = state.answers[field.key];
        if (val == null || val.toString().trim().isEmpty) {
          return false;
        }
      }
    }
    return true;
  }
}

/// Provider for dynamic service form state
final dynamicServiceProvider = NotifierProvider.family<DynamicServiceNotifier, DynamicServiceState, String>(
  DynamicServiceNotifier.new,
);

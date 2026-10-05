import { Service, ServiceField, ServiceOption, ServicePricingRule, ServiceRule } from '../db/schema/services.schema.js';
import { ruleEngine, RuleCondition } from './rule.engine.js';
import { calculateHaversineDistanceKm } from './provider-matching.engine.js';
import { AppError } from '../middleware/errorHandler.js';

export interface PriceBreakdownLineItem {
  titleAr: string;
  titleEn: string;
  type: 'base' | 'option' | 'addon' | 'installation' | 'multiplier' | 'tier' | 'step' | 'surcharge' | 'discount';
  amount: number;
  quantity?: number;
  unit?: string;
  fieldKey?: string;
}

export interface FieldAddonBreakdown {
  fieldKey: string;
  labelAr: string;
  labelEn: string;
  calculation: string;
  amount: number;
}

export interface OptionSurchargeBreakdown {
  optionId: string;
  nameAr: string;
  nameEn: string;
  amount: number;
}

export interface DiscountBreakdown {
  code?: string;
  type: string;
  amount: number;
}

export interface PriceBreakdownResult {
  basePrice: number;
  subtotal: number;
  lineItems: PriceBreakdownLineItem[];
  fieldAddons: FieldAddonBreakdown[];
  optionSurcharges: OptionSurchargeBreakdown[];
  discounts: DiscountBreakdown[];
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  evaluatedAnswers: Record<string, any>;
  evaluatedFields: string[];
  activeAlerts: Array<{
    messageAr: string;
    messageEn: string;
    severity: 'info' | 'warning' | 'error';
    targetField?: string;
  }>;
  requiredCapabilities: string[];
}

export interface PricingCalculationInput {
  service: Service;
  fields?: ServiceField[];
  pricingRules?: ServicePricingRule[];
  rules?: ServiceRule[];
  options?: ServiceOption[];
  answers?: Record<string, any>;
  selectedOptionId?: string | null;
  coupon?: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: string | number;
    minOrderValue?: string | number | null;
  } | null;
  quantity?: number;
}

export class PricingEngine {
  /**
   * Validate submitted answers against field definitions and dynamic rules
   */
  public validateAnswers(
    fields: ServiceField[] = [],
    rules: ServiceRule[] = [],
    answers: Record<string, any> = {}
  ): {
    validatedAnswers: Record<string, any>;
    activeFields: Set<string>;
    alerts: any[];
    requiredCapabilities: string[];
  } {
    const allKeys = fields.map((f) => f.key);
    const ruleEvaluation = ruleEngine.evaluateRules(rules as any, answers, allKeys);
    const validatedAnswers: Record<string, any> = {};

    for (const field of fields) {
      if (!field.isActive) continue;

      const isVisible = ruleEvaluation.visibleFields.has(field.key);
      if (!isVisible) {
        // Exclude hidden fields from answers
        continue;
      }

      const isRequired =
        field.isRequired ||
        ruleEvaluation.requiredFields.has(field.key) &&
        !ruleEvaluation.unrequiredFields.has(field.key);

      const rawVal = answers[field.key] !== undefined ? answers[field.key] : field.defaultValue;

      // Required validation
      if (isRequired) {
        if (
          rawVal === undefined ||
          rawVal === null ||
          rawVal === '' ||
          (Array.isArray(rawVal) && rawVal.length === 0)
        ) {
          throw new AppError(
            `الحقل الإلزامي مطلوب: ${field.labelAr} (${field.labelEn})`,
            400,
            'REQUIRED_FIELD_MISSING'
          );
        }
      }

      if (rawVal === undefined || rawVal === null || rawVal === '') {
        continue;
      }

      // Type-specific parsing & validation
      switch (field.fieldType) {
        case 'number':
        case 'counter':
        case 'slider': {
          const num = Number(rawVal);
          if (isNaN(num)) {
            throw new AppError(
              `القيمة المدخلة للحقل ${field.labelAr} يجب أن تكون رقماً صحيحاً.`,
              400,
              'INVALID_NUMBER_FIELD'
            );
          }

          const minVal = field.min !== null && field.min !== undefined ? Number(field.min) : undefined;
          const maxVal = field.max !== null && field.max !== undefined ? Number(field.max) : undefined;

          if (minVal !== undefined && num < minVal) {
            throw new AppError(
              `القيمة للحقل ${field.labelAr} لا يمكن أن تقل عن ${minVal}`,
              400,
              'MIN_VALUE_VIOLATION'
            );
          }
          if (maxVal !== undefined && num > maxVal) {
            throw new AppError(
              `القيمة للحقل ${field.labelAr} لا يمكن أن تزيد عن ${maxVal}`,
              400,
              'MAX_VALUE_VIOLATION'
            );
          }
          validatedAnswers[field.key] = num;
          break;
        }

        case 'checkbox':
        case 'toggle': {
          validatedAnswers[field.key] = Boolean(rawVal);
          break;
        }

        case 'select':
        case 'radio': {
          const optList = (field.options as any[]) || [];
          if (optList.length > 0) {
            const valid = optList.some(
              (o) => String(o.value) === String(rawVal) || String(o.id) === String(rawVal)
            );
            if (!valid && isRequired) {
              throw new AppError(
                `الخيار المحدد للحقل ${field.labelAr} غير صالح.`,
                400,
                'INVALID_OPTION_SELECTED'
              );
            }
          }
          validatedAnswers[field.key] = rawVal;
          break;
        }

        case 'multi_select': {
          if (!Array.isArray(rawVal)) {
            throw new AppError(
              `القيمة للحقل ${field.labelAr} يجب أن تكون مصفوفة خيارات.`,
              400,
              'INVALID_MULTI_SELECT'
            );
          }
          const optList = (field.options as any[]) || [];
          if (optList.length > 0) {
            for (const item of rawVal) {
              const valid = optList.some(
                (o) => String(o.value) === String(item) || String(o.id) === String(item)
              );
              if (!valid) {
                throw new AppError(
                  `أحد الخيارات المحددة للحقل ${field.labelAr} غير صالح: ${item}`,
                  400,
                  'INVALID_OPTION_SELECTED'
                );
              }
            }
          }
          validatedAnswers[field.key] = rawVal;
          break;
        }

        default:
          validatedAnswers[field.key] = rawVal;
          break;
      }
    }

    return {
      validatedAnswers,
      activeFields: ruleEvaluation.visibleFields,
      alerts: ruleEvaluation.alerts,
      requiredCapabilities: Array.from(ruleEvaluation.requiredCapabilities),
    };
  }

  /**
   * Authoritative Calculation of Price Breakdown
   */
  public calculate(input: PricingCalculationInput): PriceBreakdownResult {
    const {
      service,
      fields = [],
      pricingRules = [],
      rules = [],
      options = [],
      answers = {},
      selectedOptionId,
      coupon,
      quantity = 1,
    } = input;

    // 1. Validate inputs and evaluate rules
    const { validatedAnswers, activeFields, alerts, requiredCapabilities } = this.validateAnswers(
      fields,
      rules,
      answers
    );

    // Authoritative Distance Evaluation for Location-Based Trips (e.g. Towing)
    const pickupLoc = validatedAnswers['pickup_location'] || answers['pickup_location'];
    const destLoc = validatedAnswers['destination_location'] || answers['destination_location'];

    if (pickupLoc && destLoc) {
      const pLat = typeof pickupLoc === 'object' ? pickupLoc.latitude : null;
      const pLng = typeof pickupLoc === 'object' ? pickupLoc.longitude : null;
      const dLat = typeof destLoc === 'object' ? destLoc.latitude : null;
      const dLng = typeof destLoc === 'object' ? destLoc.longitude : null;

      if (
        typeof pLat === 'number' &&
        typeof pLng === 'number' &&
        typeof dLat === 'number' &&
        typeof dLng === 'number' &&
        !isNaN(pLat) &&
        !isNaN(pLng) &&
        !isNaN(dLat) &&
        !isNaN(dLng) &&
        pLat >= -90 &&
        pLat <= 90 &&
        dLat >= -90 &&
        dLat <= 90 &&
        pLng >= -180 &&
        pLng <= 180 &&
        dLng >= -180 &&
        dLng <= 180
      ) {
        const straightKm = calculateHaversineDistanceKm(pLat, pLng, dLat, dLng);
        // Estimate road distance with 1.25 road curvature factor (min 1.0 km)
        const estimatedTripKm = Math.max(1.0, Math.round(straightKm * 1.25 * 10) / 10);
        validatedAnswers['trip_distance_km'] = estimatedTripKm;
      }
    } else if (answers['trip_distance_km'] !== undefined && validatedAnswers['trip_distance_km'] === undefined) {
      const parsedDist = Number(answers['trip_distance_km']);
      if (!isNaN(parsedDist) && parsedDist > 0 && isFinite(parsedDist)) {
        validatedAnswers['trip_distance_km'] = Math.round(parsedDist * 100) / 100;
      }
    }

    let subtotal = 0;
    const lineItems: PriceBreakdownLineItem[] = [];
    const fieldAddons: FieldAddonBreakdown[] = [];
    const optionSurcharges: OptionSurchargeBreakdown[] = [];
    const discounts: DiscountBreakdown[] = [];

    // 2. Base Service Price
    let basePriceNum = parseFloat(service.basePrice || '0');
    if (isNaN(basePriceNum)) basePriceNum = 0;

    // Check if a physical service variant was selected
    let selectedOption: ServiceOption | undefined;
    if (selectedOptionId) {
      selectedOption = options.find((o) => o.id === selectedOptionId && o.isActive);
      if (selectedOption) {
        basePriceNum = parseFloat(selectedOption.price);
        lineItems.push({
          titleAr: `${service.nameAr} - ${selectedOption.nameAr}`,
          titleEn: `${service.nameEn} - ${selectedOption.nameEn}`,
          type: 'option',
          amount: basePriceNum,
          quantity: quantity,
          unit: selectedOption.unitAr || service.unitAr,
        });

        // Phase 4: Product + Installation Option
        const wantsInstallation =
          validatedAnswers['include_installation'] === true ||
          validatedAnswers['with_installation'] === true ||
          validatedAnswers['installation'] === true ||
          validatedAnswers['installation_required'] === true;

        if (wantsInstallation && selectedOption.installationPrice) {
          const installFee = parseFloat(selectedOption.installationPrice);
          if (installFee > 0) {
            subtotal += installFee * quantity;
            lineItems.push({
              titleAr: `أجرة تركيب - ${selectedOption.nameAr}`,
              titleEn: `Installation Fee - ${selectedOption.nameEn}`,
              type: 'installation',
              amount: installFee,
              quantity: quantity,
            });
          }
        }
      }
    }

    const hasExplicitBaseRule = pricingRules.some(
      (pr) => pr.isActive !== false && pr.ruleType === 'base'
    );

    if (!selectedOption) {
      if (!hasExplicitBaseRule && basePriceNum > 0) {
        lineItems.push({
          titleAr: service.nameAr,
          titleEn: service.nameEn,
          type: 'base',
          amount: basePriceNum,
          quantity: quantity,
          unit: service.unitAr,
        });
        subtotal += basePriceNum * quantity;
      }
    } else {
      subtotal += basePriceNum * quantity;
    }

    // 3. Evaluate Field Option Price Modifiers (from dynamic select/radio/multi_select options)
    for (const field of fields) {
      if (!field.isActive || !activeFields.has(field.key)) continue;

      const fieldVal = validatedAnswers[field.key];
      if (fieldVal === undefined || fieldVal === null) continue;

      const fieldOpts = (field.options as any[]) || [];
      if (fieldOpts.length === 0) continue;

      if (Array.isArray(fieldVal)) {
        // Multi-select
        for (const v of fieldVal) {
          const matchOpt = fieldOpts.find(
            (o) => String(o.value) === String(v) || String(o.id) === String(v)
          );
          if (matchOpt && matchOpt.priceModifier && Number(matchOpt.priceModifier) > 0) {
            const modAmt = Number(matchOpt.priceModifier);
            subtotal += modAmt;
            optionSurcharges.push({
              optionId: matchOpt.id || String(v),
              nameAr: `${field.labelAr}: ${matchOpt.labelAr}`,
              nameEn: `${field.labelEn}: ${matchOpt.labelEn}`,
              amount: modAmt,
            });
            lineItems.push({
              titleAr: `${field.labelAr} - ${matchOpt.labelAr}`,
              titleEn: `${field.labelEn} - ${matchOpt.labelEn}`,
              type: 'surcharge',
              amount: modAmt,
              fieldKey: field.key,
            });
          }
        }
      } else {
        // Single select / radio
        const matchOpt = fieldOpts.find(
          (o) => String(o.value) === String(fieldVal) || String(o.id) === String(fieldVal)
        );
        if (matchOpt && matchOpt.priceModifier && Number(matchOpt.priceModifier) > 0) {
          const modAmt = Number(matchOpt.priceModifier);
          subtotal += modAmt;
          optionSurcharges.push({
            optionId: matchOpt.id || String(fieldVal),
            nameAr: `${field.labelAr}: ${matchOpt.labelAr}`,
            nameEn: `${field.labelEn}: ${matchOpt.labelEn}`,
            amount: modAmt,
          });
          lineItems.push({
            titleAr: `${field.labelAr} - ${matchOpt.labelAr}`,
            titleEn: `${field.labelEn} - ${matchOpt.labelEn}`,
            type: 'surcharge',
            amount: modAmt,
            fieldKey: field.key,
          });
        }
      }
    }

    // 4. Evaluate Generic Service Pricing Rules (`service_pricing_rules`)
    const sortedPricingRules = pricingRules
      .filter((pr) => pr.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    for (const pr of sortedPricingRules) {
      // Check condition if present
      if (pr.condition) {
        const condPassed = ruleEngine.evaluateCondition(pr.condition as RuleCondition, validatedAnswers);
        if (!condPassed) continue;
      }

      const formula = pr.calculationFormula || {};
      const targetVal = pr.targetField ? validatedAnswers[pr.targetField] : undefined;

      switch (pr.ruleType) {
        case 'base': {
          if (formula.fixedAmount && formula.fixedAmount > 0) {
            subtotal += formula.fixedAmount;
            lineItems.push({
              titleAr: pr.titleAr,
              titleEn: pr.titleEn,
              type: 'base',
              amount: formula.fixedAmount,
            });
          }
          break;
        }

        case 'field_addon': {
          const isEnabled = Boolean(targetVal);
          if (isEnabled) {
            const addonAmt = formula.fixedAmount || formula.ratePerUnit || 0;
            if (addonAmt > 0) {
              subtotal += addonAmt;
              fieldAddons.push({
                fieldKey: pr.targetField || 'addon',
                labelAr: pr.titleAr,
                labelEn: pr.titleEn,
                calculation: `+${addonAmt.toFixed(2)} د.أ`,
                amount: addonAmt,
              });
              lineItems.push({
                titleAr: pr.titleAr,
                titleEn: pr.titleEn,
                type: 'addon',
                amount: addonAmt,
                fieldKey: pr.targetField || undefined,
              });
            }
          }
          break;
        }

        case 'field_multiplier': {
          const numVal = Number(targetVal || 0);
          const threshold = Number(formula.baseThreshold || formula.threshold || 0);
          const effectiveCount = Math.max(0, numVal - threshold);
          const rate = Number(formula.ratePerUnit || formula.multiplier || 0);
          if (effectiveCount > 0 && rate > 0) {
            const multAmt = Math.round(effectiveCount * rate * 100) / 100;
            subtotal += multAmt;
            fieldAddons.push({
              fieldKey: pr.targetField || 'multiplier',
              labelAr: pr.titleAr,
              labelEn: pr.titleEn,
              calculation: `${effectiveCount} × ${rate.toFixed(2)} د.أ`,
              amount: multAmt,
            });
            lineItems.push({
              titleAr: pr.titleAr,
              titleEn: pr.titleEn,
              type: 'multiplier',
              amount: multAmt,
              quantity: effectiveCount,
              fieldKey: pr.targetField || undefined,
            });
          }
          break;
        }

        case 'step_increment': {
          const numVal = Number(targetVal || 0);
          const threshold = Number(formula.baseThreshold || formula.threshold || 0);
          const stepSize = Number(formula.stepSize || 1);
          const stepRate = Number(formula.stepRate || formula.ratePerUnit || 0);

          if (numVal > threshold && stepRate > 0 && stepSize > 0) {
            const excess = numVal - threshold;
            const steps = Math.ceil(excess / stepSize);
            const stepAmt = Math.round(steps * stepRate * 100) / 100;
            subtotal += stepAmt;
            fieldAddons.push({
              fieldKey: pr.targetField || 'step_increment',
              labelAr: pr.titleAr,
              labelEn: pr.titleEn,
              calculation: `${steps} خطوات × ${stepRate.toFixed(2)} د.أ`,
              amount: stepAmt,
            });
            lineItems.push({
              titleAr: pr.titleAr,
              titleEn: pr.titleEn,
              type: 'step',
              amount: stepAmt,
              quantity: steps,
              fieldKey: pr.targetField || undefined,
            });
          }
          break;
        }

        case 'tiered_volume': {
          const numVal = Number(targetVal || 0);
          const tiers = formula.tiers || [];
          if (numVal > 0 && tiers.length > 0) {
            // Find applicable tier
            const matchedTier = tiers.find(
              (t) => numVal >= t.min && (t.max === undefined || numVal <= t.max)
            );
            if (matchedTier && matchedTier.rate > 0) {
              const tierAmt = Math.round(numVal * matchedTier.rate * 100) / 100;
              subtotal += tierAmt;
              lineItems.push({
                titleAr: `${pr.titleAr} (${numVal} × ${matchedTier.rate})`,
                titleEn: `${pr.titleEn} (${numVal} × ${matchedTier.rate})`,
                type: 'tier',
                amount: tierAmt,
                quantity: numVal,
                fieldKey: pr.targetField || undefined,
              });
            }
          }
          break;
        }

        case 'conditional_formula': {
          const fixed = Number(formula.fixedAmount || 0);
          if (fixed > 0) {
            subtotal += fixed;
            lineItems.push({
              titleAr: pr.titleAr,
              titleEn: pr.titleEn,
              type: 'surcharge',
              amount: fixed,
              fieldKey: pr.targetField || undefined,
            });
          }
          break;
        }
      }
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // 5. Coupon Discount Calculation
    let discountAmount = 0;
    if (coupon) {
      const minOrder = Number(coupon.minOrderValue || 0);
      if (subtotal < minOrder) {
        throw new AppError(
          `الحد الأدنى للطلب لتطبيق هذا الكوبون هو ${minOrder.toFixed(2)} د.أ`,
          400,
          'COUPON_MIN_ORDER_NOT_MET'
        );
      }

      const cVal = Number(coupon.value || 0);
      if (coupon.type === 'percentage') {
        discountAmount = (subtotal * cVal) / 100.0;
      } else {
        discountAmount = cVal;
      }

      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }

      discountAmount = Math.round(discountAmount * 100) / 100;

      discounts.push({
        code: coupon.code,
        type: coupon.type,
        amount: discountAmount,
      });

      lineItems.push({
        titleAr: `خصم الكوبون (${coupon.code})`,
        titleEn: `Coupon Discount (${coupon.code})`,
        type: 'discount',
        amount: -discountAmount,
      });
    }

    // 6. Enforce Min / Max Order Bounds
    const minOrderVal = service.minOrderValue ? Number(service.minOrderValue) : null;
    const maxOrderVal = service.maxOrderValue ? Number(service.maxOrderValue) : null;

    if (minOrderVal !== null && subtotal < minOrderVal) {
      throw new AppError(
        `الحد الأدنى لقيمة هذا الطلب هو ${minOrderVal.toFixed(2)} د.أ`,
        400,
        'MIN_ORDER_VALUE_NOT_MET'
      );
    }

    if (maxOrderVal !== null && subtotal > maxOrderVal) {
      throw new AppError(
        `الحد الأقصى لقيمة هذا الطلب هو ${maxOrderVal.toFixed(2)} د.أ`,
        400,
        'MAX_ORDER_VALUE_EXCEEDED'
      );
    }

    // 7. Strict Delivery Fee Invariant: Always 0.00 JOD
    const deliveryFee = 0.0;
    const totalAmount = Math.max(0, Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100);

    return {
      basePrice: basePriceNum,
      subtotal,
      lineItems,
      fieldAddons,
      optionSurcharges,
      discounts,
      discountAmount,
      deliveryFee,
      totalAmount,
      evaluatedAnswers: validatedAnswers,
      evaluatedFields: Array.from(activeFields),
      activeAlerts: alerts,
      requiredCapabilities,
    };
  }
}

export const pricingEngine = new PricingEngine();

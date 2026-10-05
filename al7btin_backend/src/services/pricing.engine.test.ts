import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pricingEngine } from './pricing.engine.js';
import { Service, ServiceField, ServiceOption, ServicePricingRule } from '../db/schema/services.schema.js';

describe('Generic Authoritative Pricing Engine', () => {
  const baseService: Service = {
    id: 'srv_generic_test',
    categoryId: 'cat_home_services',
    providerId: null,
    nameAr: 'خدمة عامة تجريبية',
    nameEn: 'Generic Test Service',
    descriptionAr: 'وصف',
    descriptionEn: 'Description',
    type: 'home_service',
    basePrice: '20.00',
    unitAr: 'خدمة',
    unitEn: 'Service',
    requiresQuotation: false,
    isAvailable: true,
    isActive: true,
    status: 'published',
    currentVersion: 1,
    slaHours: 24,
    minOrderValue: '15.00',
    maxOrderValue: '500.00',
    gallery: [],
    coverageAreas: [],
    draftSchema: null,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('calculates base price and enforces strict 0.00 JOD delivery fee', () => {
    const result = pricingEngine.calculate({
      service: baseService,
      fields: [],
      pricingRules: [],
      answers: {},
    });

    assert.equal(result.basePrice, 20.0);
    assert.equal(result.subtotal, 20.0);
    assert.equal(result.deliveryFee, 0.0);
    assert.equal(result.totalAmount, 20.0);
    assert.equal(result.lineItems.length, 1);
    assert.equal(result.lineItems[0].titleAr, baseService.nameAr);
  });

  it('calculates dynamic field option price modifiers', () => {
    const fields: ServiceField[] = [
      {
        id: 'fld_vehicle',
        serviceId: baseService.id,
        key: 'vehicleType',
        labelAr: 'نوع المركبة',
        labelEn: 'Vehicle Type',
        fieldType: 'select',
        descriptionAr: null,
        descriptionEn: null,
        placeholderAr: null,
        placeholderEn: null,
        helpTextAr: null,
        helpTextEn: null,
        defaultValue: 'small',
        min: null,
        max: null,
        step: null,
        unitAr: null,
        unitEn: null,
        options: [
          { id: 'opt_small', labelAr: 'صغيرة', labelEn: 'Small', value: 'small', priceModifier: 0 },
          { id: 'opt_large', labelAr: 'كبيرة', labelEn: 'Large', value: 'large', priceModifier: 15 },
        ],
        validationRules: {},
        sortOrder: 0,
        isRequired: true,
        isActive: true,
        isSearchable: false,
        isFilterable: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = pricingEngine.calculate({
      service: baseService,
      fields,
      pricingRules: [],
      answers: { vehicleType: 'large' },
    });

    assert.equal(result.basePrice, 20.0);
    assert.equal(result.subtotal, 35.0); // 20 + 15
    assert.equal(result.deliveryFee, 0.0);
    assert.equal(result.totalAmount, 35.0);
    assert.equal(result.optionSurcharges.length, 1);
    assert.equal(result.optionSurcharges[0].amount, 15.0);
  });

  it('calculates field multiplier (e.g. workers * ratePerUnit)', () => {
    const fields: ServiceField[] = [
      {
        id: 'fld_workers',
        serviceId: baseService.id,
        key: 'workersCount',
        labelAr: 'عدد العمال',
        labelEn: 'Workers Count',
        fieldType: 'counter',
        descriptionAr: null,
        descriptionEn: null,
        placeholderAr: null,
        placeholderEn: null,
        helpTextAr: null,
        helpTextEn: null,
        defaultValue: 1,
        min: '1',
        max: '10',
        step: '1',
        unitAr: 'عامل',
        unitEn: 'worker',
        options: [],
        validationRules: { min: 1, max: 10 },
        sortOrder: 0,
        isRequired: true,
        isActive: true,
        isSearchable: false,
        isFilterable: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pricingRules: ServicePricingRule[] = [
      {
        id: 'prc_workers',
        serviceId: baseService.id,
        ruleType: 'field_multiplier',
        titleAr: 'أجرة العمال الإضافيين',
        titleEn: 'Workers Hourly Fee',
        targetField: 'workersCount',
        calculationFormula: { ratePerUnit: 10.0 },
        condition: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = pricingEngine.calculate({
      service: baseService,
      fields,
      pricingRules,
      answers: { workersCount: 3 },
    });

    assert.equal(result.basePrice, 20.0);
    assert.equal(result.subtotal, 50.0); // 20 + (3 * 10)
    assert.equal(result.totalAmount, 50.0);
    assert.equal(result.fieldAddons.length, 1);
    assert.equal(result.fieldAddons[0].amount, 30.0);
  });

  it('calculates step increment beyond threshold (e.g. floor > 2)', () => {
    const fields: ServiceField[] = [
      {
        id: 'fld_floor',
        serviceId: baseService.id,
        key: 'floorNum',
        labelAr: 'رقم الطابق',
        labelEn: 'Floor Number',
        fieldType: 'number',
        descriptionAr: null,
        descriptionEn: null,
        placeholderAr: null,
        placeholderEn: null,
        helpTextAr: null,
        helpTextEn: null,
        defaultValue: 1,
        min: '0',
        max: '20',
        step: '1',
        unitAr: 'طابق',
        unitEn: 'floor',
        options: [],
        validationRules: {},
        sortOrder: 0,
        isRequired: false,
        isActive: true,
        isSearchable: false,
        isFilterable: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pricingRules: ServicePricingRule[] = [
      {
        id: 'prc_floor_step',
        serviceId: baseService.id,
        ruleType: 'step_increment',
        titleAr: 'رسوم طوابق إضافية بدون مصعد',
        titleEn: 'Upper floor surcharge',
        targetField: 'floorNum',
        calculationFormula: {
          baseThreshold: 2,
          stepSize: 1,
          stepRate: 5.0,
        },
        condition: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Floor 4: (4 - 2) = 2 steps * 5 = +10 JOD
    const result = pricingEngine.calculate({
      service: baseService,
      fields,
      pricingRules,
      answers: { floorNum: 4 },
    });

    assert.equal(result.subtotal, 30.0); // 20 + 10
    assert.equal(result.totalAmount, 30.0);
  });

  it('calculates conditional formula pricing (IF condition THEN add fixed fee)', () => {
    const fields: ServiceField[] = [
      {
        id: 'fld_elevator',
        serviceId: baseService.id,
        key: 'hasElevator',
        labelAr: 'يوجد مصعد؟',
        labelEn: 'Has Elevator?',
        fieldType: 'toggle',
        descriptionAr: null,
        descriptionEn: null,
        placeholderAr: null,
        placeholderEn: null,
        helpTextAr: null,
        helpTextEn: null,
        defaultValue: true,
        min: null,
        max: null,
        step: null,
        unitAr: null,
        unitEn: null,
        options: [],
        validationRules: {},
        sortOrder: 0,
        isRequired: false,
        isActive: true,
        isSearchable: false,
        isFilterable: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pricingRules: ServicePricingRule[] = [
      {
        id: 'prc_no_elevator',
        serviceId: baseService.id,
        ruleType: 'conditional_formula',
        titleAr: 'رسوم عدم توفر مصعد',
        titleEn: 'No elevator fee',
        targetField: null,
        calculationFormula: { fixedAmount: 8.0 },
        condition: {
          operator: 'AND',
          expressions: [{ field: 'hasElevator', op: 'eq', value: false }],
        },
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // When hasElevator is false -> +8 JOD
    const resultNoElevator = pricingEngine.calculate({
      service: baseService,
      fields,
      pricingRules,
      answers: { hasElevator: false },
    });
    assert.equal(resultNoElevator.subtotal, 28.0);

    // When hasElevator is true -> +0 JOD
    const resultWithElevator = pricingEngine.calculate({
      service: baseService,
      fields,
      pricingRules,
      answers: { hasElevator: true },
    });
    assert.equal(resultWithElevator.subtotal, 20.0);
  });

  it('applies coupon discount and validates min order bounds', () => {
    const result = pricingEngine.calculate({
      service: baseService,
      fields: [],
      pricingRules: [],
      answers: {},
      coupon: {
        id: 'cpn_10pct',
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        minOrderValue: 15.0,
      },
    });

    // 20 JOD - 10% (2 JOD) = 18.00 JOD
    assert.equal(result.subtotal, 20.0);
    assert.equal(result.discountAmount, 2.0);
    assert.equal(result.deliveryFee, 0.0);
    assert.equal(result.totalAmount, 18.0);
  });

  it('rejects answers violating min/max validation rules', () => {
    const fields: ServiceField[] = [
      {
        id: 'fld_qty',
        serviceId: baseService.id,
        key: 'quantity',
        labelAr: 'الكمية',
        labelEn: 'Quantity',
        fieldType: 'number',
        descriptionAr: null,
        descriptionEn: null,
        placeholderAr: null,
        placeholderEn: null,
        helpTextAr: null,
        helpTextEn: null,
        defaultValue: 1,
        min: '2',
        max: '10',
        step: '1',
        unitAr: null,
        unitEn: null,
        options: [],
        validationRules: {},
        sortOrder: 0,
        isRequired: true,
        isActive: true,
        isSearchable: false,
        isFilterable: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    assert.throws(
      () => {
        pricingEngine.calculate({
          service: baseService,
          fields,
          pricingRules: [],
          answers: { quantity: 1 }, // Below min of 2
        });
      },
      /لا يمكن أن تقل عن 2/
    );
  });
});

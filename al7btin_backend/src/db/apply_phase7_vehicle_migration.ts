import { db } from './index.js';
import { serviceCategories } from './schema/categories.schema.js';
import {
  services,
  serviceFields,
  serviceRules,
  servicePricingRules,
  serviceRequirements,
  serviceVersions,
} from './schema/services.schema.js';
import { providers, providerServices } from './schema/providers.schema.js';
import { providerCapabilities } from './schema/dispatch.schema.js';
import { eq, sql } from 'drizzle-orm';

export async function applyPhase7VehicleMigration() {
  console.log('🚗 [PHASE 7 MIGRATION] Starting additive non-destructive migration...');

  // 1. DDL: Create order_reviews table and add columns to orders table additively
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "order_reviews" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "order_id" varchar(50) NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
      "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "provider_id" varchar(50) NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
      "service_id" varchar(50) REFERENCES "services"("id") ON DELETE SET NULL,
      "rating" integer NOT NULL,
      "comment" text,
      "is_verified_purchase" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_reviews_order_unique" ON "order_reviews" ("order_id");
    CREATE INDEX IF NOT EXISTS "idx_order_reviews_provider" ON "order_reviews" ("provider_id");
    CREATE INDEX IF NOT EXISTS "idx_order_reviews_customer" ON "order_reviews" ("customer_id");
    CREATE INDEX IF NOT EXISTS "idx_order_reviews_rating" ON "order_reviews" ("rating");
    CREATE INDEX IF NOT EXISTS "idx_order_reviews_created" ON "order_reviews" ("created_at");

    -- Add additive columns to orders
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "destination_address" text;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "destination_latitude" double precision;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "destination_longitude" double precision;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trip_distance_km" numeric(10, 2);
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
  `);

  console.log('✅ [PHASE 7 MIGRATION] DDL migrations applied successfully.');

  // 2. Insert Category: Vehicle & Roadside Services
  await db
    .insert(serviceCategories)
    .values([
      {
        id: 'cat_vehicle_services',
        nameAr: 'خدمات المركبات والمساعدة على الطريق',
        nameEn: 'Vehicle & Roadside Services',
        descriptionAr: 'خدمات الونش، السحب، الميكانيكي المتنقل، شحن المركبات الكهربائية، وبنشر وإصلاح الإطارات',
        descriptionEn: 'Vehicle towing, roadside mechanic, emergency EV mobile charging, and flat-tire assistance',
        iconName: 'car_repair_rounded',
        sortOrder: 4,
        isActive: true,
      },
    ])
    .onConflictDoUpdate({
      target: [serviceCategories.id],
      set: {
        nameAr: 'خدمات المركبات والمساعدة على الطريق',
        nameEn: 'Vehicle & Roadside Services',
        isActive: true,
      },
    });

  // Find active providers to assign services to
  const activeProviders = await db.select().from(providers).where(eq(providers.isActive, true));
  const defaultProviderId = activeProviders[0]?.id;

  // 3. Define the 4 Vehicle & Roadside Services
  const vehicleServicesData: any[] = [
    // -------------------------------------------------------------
    // 1. Vehicle Towing / Car Transport
    // -------------------------------------------------------------
    {
      service: {
        id: 'srv_vehicle_towing',
        categoryId: 'cat_vehicle_services',
        providerId: defaultProviderId,
        nameAr: 'ونش وسحب المركبات',
        nameEn: 'Vehicle Towing / Car Transport',
        descriptionAr: 'خدمة سحب ونقل المركبات المتعطلة أو المتعرضة لحوادث بواسطة سطحات هيدروليكية وونشات متخصصة ومجهزة',
        descriptionEn: 'Emergency towing and vehicle transport using hydraulic flatbeds and specialized recovery winches',
        type: 'home_service',
        basePrice: '10.00',
        unitAr: 'رحلة',
        unitEn: 'trip',
        requiresQuotation: false,
        isLaborOnly: false,
        serviceMode: 'dynamic_form',
        startingPriceLabelAr: 'يبدأ من (10.00 د.أ + سعر الكيلومتر)',
        startingPriceLabelEn: 'Starting from (10.00 JOD + distance rate)',
        disclaimerAr: 'يشمل السعر الأساسي رسوم الانتقال والتحميل، وتُحتسب أجرة المسافة الفعلية تلقائياً بحسب مسار الرحلة بالكيلومتر.',
        disclaimerEn: 'Base price covers callout and loading. Route distance is calculated automatically per kilometer.',
        status: 'published',
        isPublished: true,
        isActive: true,
        currentVersion: 1,
        slaHours: 1,
      },
      fields: [
        {
          id: 'fld_towing_pickup',
          key: 'pickup_location',
          labelAr: 'موقع استلام المركبة (نقطة الانطلاق)',
          labelEn: 'Vehicle Pickup Location',
          fieldType: 'location',
          placeholderAr: 'حدد موقع المركبة على الخريطة أو اكتب العنوان',
          placeholderEn: 'Select vehicle location on map or enter address',
          isRequired: true,
          sortOrder: 1,
        },
        {
          id: 'fld_towing_dest',
          key: 'destination_location',
          labelAr: 'وجهة نقل المركبة (نقطة الوصول)',
          labelEn: 'Vehicle Destination',
          fieldType: 'location',
          placeholderAr: 'حدد الوجهة (ورشة صيانة، منزل، كراج)',
          placeholderEn: 'Select destination (repair shop, home, garage)',
          isRequired: true,
          sortOrder: 2,
        },
        {
          id: 'fld_towing_vehicle_type',
          key: 'vehicle_type',
          labelAr: 'نوع المركبة المراد نقلها',
          labelEn: 'Vehicle Type',
          fieldType: 'select',
          isRequired: true,
          defaultValue: 'sedan',
          options: [
            { id: 'sedan', labelAr: 'سيارة صالون / سيدان (Sedan)', labelEn: 'Sedan / Hatchback', value: 'sedan', priceModifier: 0 },
            { id: 'suv', labelAr: 'سيارة دفع رباعي / جيب (SUV / 4x4)', labelEn: 'SUV / 4x4', value: 'suv', priceModifier: 3 },
            { id: 'van', labelAr: 'باص / فانيت تجاري (Van)', labelEn: 'Van / Minibus', value: 'van', priceModifier: 5 },
            { id: 'heavy_truck', labelAr: 'شاحنة / مركبة ثقيلة (Truck)', labelEn: 'Heavy Truck', value: 'heavy_truck', priceModifier: 15 },
            { id: 'motorcycle', labelAr: 'دراجة نارية (Motorcycle)', labelEn: 'Motorcycle', value: 'motorcycle', priceModifier: -2 },
          ],
          sortOrder: 3,
        },
        {
          id: 'fld_towing_equipment_type',
          key: 'towing_equipment_type',
          labelAr: 'نوع الونش المطلوب',
          labelEn: 'Required Towing Equipment',
          fieldType: 'select',
          isRequired: true,
          defaultValue: 'flatbed',
          options: [
            { id: 'flatbed', labelAr: 'سطحة هيدروليكية كاملة (Hydraulic Flatbed)', labelEn: 'Hydraulic Flatbed', value: 'flatbed', priceModifier: 0 },
            { id: 'wheel_lift', labelAr: 'ونش رفع العجلات (Wheel-lift Tow Truck)', labelEn: 'Wheel-lift Tow Truck', value: 'wheel_lift', priceModifier: 0 },
            { id: 'heavy_winch', labelAr: 'ونش سحب وسحب ثقيل (Heavy Winch Recovery)', labelEn: 'Heavy Winch Recovery', value: 'heavy_winch', priceModifier: 10 },
          ],
          sortOrder: 4,
        },
        {
          id: 'fld_towing_condition',
          key: 'vehicle_condition',
          labelAr: 'حالة حركة المركبة',
          labelEn: 'Vehicle Movement Condition',
          fieldType: 'select',
          isRequired: true,
          defaultValue: 'drivable_neutral',
          options: [
            { id: 'drivable_neutral', labelAr: 'المركبة تدور على الغيار الحر N (حركة سهلة)', labelEn: 'Rolls in Neutral (Easy Load)', value: 'drivable_neutral', priceModifier: 0 },
            { id: 'locked_wheels', labelAr: 'العجلات مقفلة أو بدون مفتاح (تحتاج زلاجات)', labelEn: 'Locked Wheels / No Key (Requires Skates)', value: 'locked_wheels', priceModifier: 5 },
            { id: 'accident_overturned', labelAr: 'حادث سير بليغ أو مركبة منقلبة (سحب خاص)', labelEn: 'Severe Accident / Overturned (Special Recovery)', value: 'accident_overturned', priceModifier: 15 },
          ],
          sortOrder: 5,
        },
        {
          id: 'fld_towing_notes',
          key: 'special_notes',
          labelAr: 'ملاحظات إضافية للمزود',
          labelEn: 'Additional Notes',
          fieldType: 'textarea',
          isRequired: false,
          placeholderAr: 'أي تعليمات حول موقع المركبة أو كراج الوصول',
          placeholderEn: 'Any special parking or delivery instructions',
          sortOrder: 6,
        },
        {
          id: 'fld_towing_photos',
          key: 'vehicle_photos',
          labelAr: 'صور المركبة أو موقع الحادث (اختياري)',
          labelEn: 'Vehicle / Scene Photos (Optional)',
          fieldType: 'image_upload',
          isRequired: false,
          sortOrder: 7,
        },
      ],
      rules: [
        {
          id: 'rul_towing_flatbed',
          ruleName: 'Require Flatbed Capability',
          condition: {
            operator: 'OR',
            expressions: [
              { field: 'towing_equipment_type', op: 'eq', value: 'flatbed' },
              { field: 'vehicle_type', op: 'eq', value: 'suv' },
            ],
          },
          actions: [
            { type: 'REQUIRE_CAPABILITY', capabilityKey: 'flatbed_towing' },
          ],
          priority: 10,
        },
        {
          id: 'rul_towing_heavy',
          ruleName: 'Require Heavy Towing for Trucks',
          condition: {
            operator: 'OR',
            expressions: [
              { field: 'vehicle_type', op: 'eq', value: 'heavy_truck' },
              { field: 'towing_equipment_type', op: 'eq', value: 'heavy_winch' },
              { field: 'vehicle_condition', op: 'eq', value: 'accident_overturned' },
            ],
          },
          actions: [
            { type: 'REQUIRE_CAPABILITY', capabilityKey: 'heavy_towing' },
            {
              type: 'SHOW_ALERT',
              messageAr: 'تتطلب هذه العملية ونش سحب ثقيل ومعدات متطورة لضمان السلامة.',
              messageEn: 'This recovery requires heavy-duty towing equipment for safety.',
              severity: 'info',
            },
          ],
          priority: 20,
        },
      ],
      pricingRules: [
        {
          id: 'pr_towing_base',
          ruleType: 'base',
          titleAr: 'أجرة الطلب والتحميل الأساسية',
          titleEn: 'Base Callout & Loading Fee',
          calculationFormula: { fixedAmount: 10.0 },
          sortOrder: 1,
        },
        {
          id: 'pr_towing_distance',
          ruleType: 'field_multiplier',
          titleAr: 'أجرة المسافة المقطوعة (0.60 د.أ / كم)',
          titleEn: 'Route Distance Rate (0.60 JOD / km)',
          targetField: 'trip_distance_km',
          calculationFormula: { ratePerUnit: 0.6, baseThreshold: 0 },
          sortOrder: 2,
        },
      ],
      requirements: [
        {
          id: 'req_towing_base',
          requirementType: 'provider_capability',
          capabilityKey: 'towing_truck',
          capabilityNameAr: 'ونش سحب مرخص',
          capabilityNameEn: 'Licensed Tow Truck',
          isRequired: true,
        },
      ],
    },

    // -------------------------------------------------------------
    // 2. Roadside Mechanic
    // -------------------------------------------------------------
    {
      service: {
        id: 'srv_roadside_mechanic',
        categoryId: 'cat_vehicle_services',
        providerId: defaultProviderId,
        nameAr: 'ميكانيكي متنقل / مساعدة على الطريق',
        nameEn: 'Roadside Mechanic',
        descriptionAr: 'فحص وتشخيص أعطال المركبات في موقعك، إصلاح مشاكل الكهرباء، المحرك، البطارية، والبدء مع إمكانية توفير قطع الغيار',
        descriptionEn: 'On-site vehicle diagnostic inspection, battery jumpstart, electrical and mechanical roadside breakdown assistance',
        type: 'home_service',
        basePrice: '15.00',
        unitAr: 'زيارة فحص',
        unitEn: 'visit',
        requiresQuotation: false,
        isLaborOnly: true,
        serviceMode: 'dynamic_form',
        startingPriceLabelAr: 'أجرة الفحص والانتقال',
        startingPriceLabelEn: 'Inspection Callout Fee',
        disclaimerAr: 'السعر الظاهر (15.00 د.أ) يمثل أجرة الكشف والانتقال الأساسية، ولا يشمل قطع الغيار أو المواد أو أعمال الصيانة الكبرى التي تتطلب عرض سعر معتمد من العميل.',
        disclaimerEn: 'The displayed price (15.00 JOD) is the labor inspection callout fee only and does not include replacement parts or materials.',
        status: 'published',
        isPublished: true,
        isActive: true,
        currentVersion: 1,
        slaHours: 1,
      },
      fields: [
        {
          id: 'fld_mech_location',
          key: 'current_location',
          labelAr: 'موقع تعطل المركبة الحالي',
          labelEn: 'Current Breakdown Location',
          fieldType: 'location',
          placeholderAr: 'حدد موقع وقوف المركبة بدقة',
          placeholderEn: 'Select current vehicle breakdown location',
          isRequired: true,
          sortOrder: 1,
        },
        {
          id: 'fld_mech_make_model',
          key: 'vehicle_make_model',
          labelAr: 'نوع المركبة وطرازها وسنة الصنع',
          labelEn: 'Vehicle Make, Model & Year',
          fieldType: 'text',
          placeholderAr: 'مثال: تويوتا كامري 2020 هايبرد',
          placeholderEn: 'e.g. Toyota Camry 2020 Hybrid',
          isRequired: true,
          sortOrder: 2,
        },
        {
          id: 'fld_mech_problem_category',
          key: 'problem_category',
          labelAr: 'تصنيف العطل الأساسي',
          labelEn: 'Problem Category',
          fieldType: 'select',
          isRequired: true,
          defaultValue: 'starting_problem',
          options: [
            { id: 'battery_issue', labelAr: 'مشكلة بطارية / شحن ضعيف (Battery Issue)', labelEn: 'Battery Issue', value: 'battery_issue', priceModifier: 0 },
            { id: 'starting_problem', labelAr: 'السيارة لا تدور / سلف (Starting / Starter Problem)', labelEn: 'Starting Problem', value: 'starting_problem', priceModifier: 0 },
            { id: 'engine_issue', labelAr: 'عطل في المحرك / صوت غير طبيعي (Engine Issue)', labelEn: 'Engine Issue', value: 'engine_issue', priceModifier: 0 },
            { id: 'electrical_issue', labelAr: 'عطل كهربائي / إضاءة / فيوزات (Electrical Issue)', labelEn: 'Electrical Issue', value: 'electrical_issue', priceModifier: 0 },
            { id: 'overheating', labelAr: 'ارتفاع حرارة المحرك / تهريب ماء (Overheating / Radiator)', labelEn: 'Overheating', value: 'overheating', priceModifier: 0 },
            { id: 'fuel_issue', labelAr: 'انقطاع الوقود / طرمبة بنزين (Fuel System Issue)', labelEn: 'Fuel Issue', value: 'fuel_issue', priceModifier: 0 },
            { id: 'flat_tire_mechanic', labelAr: 'مشكلة عكوس أو بريكات أو تعليق (Brakes / Suspension)', labelEn: 'Brakes / Suspension', value: 'flat_tire_mechanic', priceModifier: 0 },
            { id: 'other_mechanic', labelAr: 'عطل آخر غير محدد (Other Problem)', labelEn: 'Other Problem', value: 'other_mechanic', priceModifier: 0 },
          ],
          sortOrder: 3,
        },
        {
          id: 'fld_mech_description',
          key: 'problem_description',
          labelAr: 'وصف العطل والأعراض بالتفصيل (إجباري)',
          labelEn: 'Detailed Problem Description (Mandatory)',
          fieldType: 'textarea',
          placeholderAr: 'اشرح ما حدث بدقة: الأصوات، الرموز الظاهرة على الشاشة، هل انطفأت فجأة؟',
          placeholderEn: 'Describe what happened, any dashboard warning lights, or abnormal sounds',
          isRequired: true,
          validationRules: { minLength: 10 },
          sortOrder: 4,
        },
        {
          id: 'fld_mech_photos',
          key: 'problem_photos',
          labelAr: 'صور لوحة القيادة أو المحرك (اختياري)',
          labelEn: 'Dashboard / Engine Photos (Optional)',
          fieldType: 'image_upload',
          isRequired: false,
          sortOrder: 5,
        },
        {
          id: 'fld_mech_notes',
          key: 'additional_notes',
          labelAr: 'ملاحظات إضافية للميكانيكي',
          labelEn: 'Additional Notes',
          fieldType: 'textarea',
          isRequired: false,
          sortOrder: 6,
        },
      ],
      rules: [
        {
          id: 'rul_mech_battery',
          ruleName: 'Alert for Battery and Starter Check',
          condition: {
            operator: 'OR',
            expressions: [
              { field: 'problem_category', op: 'eq', value: 'battery_issue' },
              { field: 'problem_category', op: 'eq', value: 'starting_problem' },
            ],
          },
          actions: [
            {
              type: 'SHOW_ALERT',
              messageAr: 'سيقوم الميكانيكي بإحضار جهاز فحص البطارية وشاحن طوارئ محمول.',
              messageEn: 'Technician will arrive with a portable battery analyzer and booster.',
              severity: 'info',
            },
          ],
          priority: 10,
        },
      ],
      pricingRules: [
        {
          id: 'pr_mech_base',
          ruleType: 'base',
          titleAr: 'أجرة الفحص والانتقال الميداني',
          titleEn: 'On-site Diagnostic & Labor Inspection Fee',
          calculationFormula: { fixedAmount: 15.0 },
          sortOrder: 1,
        },
      ],
      requirements: [
        {
          id: 'req_mech_base',
          requirementType: 'provider_capability',
          capabilityKey: 'roadside_mechanic',
          capabilityNameAr: 'ميكانيكي مركبات متنقل معتمد',
          capabilityNameEn: 'Certified Mobile Mechanic',
          isRequired: true,
        },
        {
          id: 'req_mech_scanner',
          requirementType: 'equipment',
          capabilityKey: 'diagnostic_scanner',
          capabilityNameAr: 'جهاز فحص كمبيوتر وتشخيص OBD',
          capabilityNameEn: 'OBD Diagnostic Scanner Tool',
          isRequired: true,
        },
      ],
    },

    // -------------------------------------------------------------
    // 3. Emergency EV Charging
    // -------------------------------------------------------------
    {
      service: {
        id: 'srv_emergency_ev_charging',
        categoryId: 'cat_vehicle_services',
        providerId: defaultProviderId,
        nameAr: 'شحن طوارئ للمركبات الكهربائية',
        nameEn: 'Emergency EV Charging',
        descriptionAr: 'تزويد المركبات الكهربائية المنقطعة بشحن طوارئ متنقل يكفي للوصول لأقرب محطة شحن سريع',
        descriptionEn: 'Mobile emergency roadside EV rescue charging to provide enough range to reach the nearest charging station',
        type: 'home_service',
        basePrice: '20.00',
        unitAr: 'جلسة شحن طوارئ',
        unitEn: 'rescue session',
        requiresQuotation: false,
        isLaborOnly: false,
        serviceMode: 'dynamic_form',
        startingPriceLabelAr: 'رسوم الانتقال والشحن الأساسي',
        startingPriceLabelEn: 'Callout & Emergency Session Fee',
        disclaimerAr: 'تشمل الخدمة رسوم الانتقال السريع وتجهيز الشاحن المتنقل المتوافق مع مركبتك لتزويدك بمدى قيادة آمن للوصول لمحطة الشحن.',
        disclaimerEn: 'Covers emergency mobile charger dispatch and high-output roadside session to ensure vehicle reachability.',
        status: 'published',
        isPublished: true,
        isActive: true,
        currentVersion: 1,
        slaHours: 1,
      },
      fields: [
        {
          id: 'fld_ev_location',
          key: 'current_location',
          labelAr: 'موقع المركبة الكهربائية',
          labelEn: 'Current EV Location',
          fieldType: 'location',
          placeholderAr: 'حدد موقع المركبة على الخريطة',
          placeholderEn: 'Select current location on map',
          isRequired: true,
          sortOrder: 1,
        },
        {
          id: 'fld_ev_make_model',
          key: 'ev_make_model',
          labelAr: 'الشركة الصانعة وطراز المركبة الكهربائية',
          labelEn: 'EV Manufacturer & Model',
          fieldType: 'text',
          placeholderAr: 'مثال: تسلا Model Y، هيونداي Ioniq 5، بي واي دي Atto 3',
          placeholderEn: 'e.g. Tesla Model Y, Hyundai Ioniq 5, BYD Atto 3',
          isRequired: true,
          sortOrder: 2,
        },
        {
          id: 'fld_ev_battery_pct',
          key: 'current_battery_pct',
          labelAr: 'نسبة البطارية المتبقية حالياً (%)',
          labelEn: 'Current Battery Percentage (%)',
          fieldType: 'number',
          min: '0',
          max: '100',
          defaultValue: 0,
          placeholderAr: 'مثال: 0% أو 2%',
          placeholderEn: 'e.g. 0% or 2%',
          isRequired: false,
          sortOrder: 3,
        },
        {
          id: 'fld_ev_connector_type',
          key: 'connector_type',
          labelAr: 'نوع منفذ الشحن بالمركبة',
          labelEn: 'Charging Port / Connector Type',
          fieldType: 'select',
          isRequired: true,
          defaultValue: 'ccs_combo_2',
          options: [
            { id: 'ccs_combo_2', labelAr: 'CCS Combo 2 (أوروبي شائع في الأردن)', labelEn: 'CCS Combo 2 (European Standard)', value: 'ccs_combo_2', priceModifier: 0 },
            { id: 'type_2', labelAr: 'Type 2 Mennekes (شحن تيار متردد AC)', labelEn: 'Type 2 Mennekes (AC)', value: 'type_2', priceModifier: 0 },
            { id: 'gbt', labelAr: 'GB/T (المعيار الصيني للسيارات المستوردة)', labelEn: 'GB/T (Chinese Standard)', value: 'gbt', priceModifier: 0 },
            { id: 'chademo', labelAr: 'CHAdeMO (المعيار الياباني مثل نيسان ليف)', labelEn: 'CHAdeMO (Japanese Standard)', value: 'chademo', priceModifier: 0 },
          ],
          sortOrder: 4,
        },
        {
          id: 'fld_ev_notes',
          key: 'notes',
          labelAr: 'ملاحظات إضافية ومواصفات الكراج',
          labelEn: 'Location & Access Notes',
          fieldType: 'textarea',
          isRequired: false,
          sortOrder: 5,
        },
      ],
      rules: [
        {
          id: 'rul_ev_ccs2',
          ruleName: 'Require CCS2 Compatibility',
          condition: {
            operator: 'OR',
            expressions: [
              { field: 'connector_type', op: 'eq', value: 'ccs_combo_2' },
              { field: 'connector_type', op: 'eq', value: 'type_2' },
            ],
          },
          actions: [
            { type: 'REQUIRE_CAPABILITY', capabilityKey: 'ev_connector_type2' },
          ],
          priority: 10,
        },
        {
          id: 'rul_ev_gbt',
          ruleName: 'Require GBT Compatibility',
          condition: {
            operator: 'OR',
            expressions: [
              { field: 'connector_type', op: 'eq', value: 'gbt' },
            ],
          },
          actions: [
            { type: 'REQUIRE_CAPABILITY', capabilityKey: 'ev_connector_gbt' },
          ],
          priority: 20,
        },
      ],
      pricingRules: [
        {
          id: 'pr_ev_base',
          ruleType: 'base',
          titleAr: 'رسوم الانتقال وتجهيز وحدة الشحن المتنقلة',
          titleEn: 'Emergency Mobile Charging Callout & Session Fee',
          calculationFormula: { fixedAmount: 20.0 },
          sortOrder: 1,
        },
      ],
      requirements: [
        {
          id: 'req_ev_base',
          requirementType: 'provider_capability',
          capabilityKey: 'mobile_ev_charger',
          capabilityNameAr: 'شاحن سيارات كهربائية متنقل عالي القدرة',
          capabilityNameEn: 'High-Output Mobile EV Charger Unit',
          isRequired: true,
        },
      ],
    },

    // -------------------------------------------------------------
    // 4. Roadside Tire / Flat-Tire Assistance
    // -------------------------------------------------------------
    {
      service: {
        id: 'srv_roadside_tire_assistance',
        categoryId: 'cat_vehicle_services',
        providerId: defaultProviderId,
        nameAr: 'بنشر وإصلاح الإطارات المتنقل',
        nameEn: 'Roadside Tire / Flat-Tire Assistance',
        descriptionAr: 'رقع البنشر، تبديل الإطار بالإسبير، تزويد الهواء، وتأمين إطارات بديلة جديدة في موقع تعطل المركبة',
        descriptionEn: 'Emergency flat tire puncture repair, spare tire installation, air inflation, and mobile tire replacement on site',
        type: 'home_service',
        basePrice: '10.00',
        unitAr: 'زيارة إصلاح',
        unitEn: 'visit',
        requiresQuotation: false,
        isLaborOnly: false,
        serviceMode: 'dynamic_form',
        startingPriceLabelAr: 'أجرة الخدمة الأساسية',
        startingPriceLabelEn: 'Basic Service Fee',
        disclaimerAr: 'تشمل أجرة الخدمة الأساسية (10.00 د.أ) الانتقال ورقعة إطار واحد أو تبديل الإسبير. في حال طلب إطار جديد أو رقع إضافية يتم تقديم عرض سعر معتمد.',
        disclaimerEn: 'Basic fee (10.00 JOD) covers callout and puncture repair or spare swap for 1 tire. New tires or extra patches handled via quotation.',
        status: 'published',
        isPublished: true,
        isActive: true,
        currentVersion: 1,
        slaHours: 1,
      },
      fields: [
        {
          id: 'fld_tire_location',
          key: 'current_location',
          labelAr: 'موقع تعطل المركبة الحالي',
          labelEn: 'Current Location',
          fieldType: 'location',
          placeholderAr: 'حدد موقع وقوف المركبة على الخريطة',
          placeholderEn: 'Select current vehicle location',
          isRequired: true,
          sortOrder: 1,
        },
        {
          id: 'fld_tire_problem_type',
          key: 'tire_problem_type',
          labelAr: 'نوع المشكلة أو الخدمة المطلوبة',
          labelEn: 'Tire Issue Type',
          fieldType: 'select',
          isRequired: true,
          defaultValue: 'puncture_repair',
          options: [
            { id: 'puncture_repair', labelAr: 'رقعة بنشر سريع / مسمار (Puncture Repair)', labelEn: 'Puncture Repair', value: 'puncture_repair', priceModifier: 0 },
            { id: 'spare_swap', labelAr: 'تركيب الإطار الاحتياطي (إسبير) (Spare Tire Swap)', labelEn: 'Spare Tire Swap', value: 'spare_swap', priceModifier: 0 },
            { id: 'air_inflation', labelAr: 'تزويد هواء ومعايرة الضغط فقط (Air Inflation)', labelEn: 'Air Inflation Only', value: 'air_inflation', priceModifier: -3 },
            { id: 'buy_new_tire', labelAr: 'تأمين وشراء إطار جديد في الموقع (Buy New Tire)', labelEn: 'Buy New Tire on Site', value: 'buy_new_tire', priceModifier: 0 },
            { id: 'multiple_tires', labelAr: 'أكثر من إطار متعطل (Multiple Flat Tires)', labelEn: 'Multiple Flat Tires', value: 'multiple_tires', priceModifier: 5 },
          ],
          sortOrder: 2,
        },
        {
          id: 'fld_tire_affected_count',
          key: 'affected_tires_count',
          labelAr: 'عدد الإطارات المتأثرة',
          labelEn: 'Affected Tires Count',
          fieldType: 'counter',
          min: '1',
          max: '4',
          defaultValue: 1,
          isRequired: true,
          sortOrder: 3,
        },
        {
          id: 'fld_tire_size',
          key: 'tire_size',
          labelAr: 'مقاس الإطار المكتوب على العجل (اختياري)',
          labelEn: 'Tire Size (Optional, e.g. 205/55R16)',
          fieldType: 'text',
          placeholderAr: 'مثال: 205/55 R16 أو 225/45 R18',
          placeholderEn: 'e.g. 205/55 R16',
          isRequired: false,
          sortOrder: 4,
        },
        {
          id: 'fld_tire_spare_available',
          key: 'spare_tire_available',
          labelAr: 'هل يتوفر لديك إطار احتياطي (إسبير) سليم؟',
          labelEn: 'Is a functional spare tire available in the car?',
          fieldType: 'toggle',
          defaultValue: true,
          isRequired: true,
          sortOrder: 5,
        },
        {
          id: 'fld_tire_notes',
          key: 'description',
          labelAr: 'ملاحظات وتفاصيل إضافية',
          labelEn: 'Additional Description',
          fieldType: 'textarea',
          isRequired: false,
          sortOrder: 6,
        },
        {
          id: 'fld_tire_photos',
          key: 'photos',
          labelAr: 'صور الإطار المتعطل (اختياري)',
          labelEn: 'Tire Photos (Optional)',
          fieldType: 'image_upload',
          isRequired: false,
          sortOrder: 7,
        },
      ],
      rules: [
        {
          id: 'rul_tire_new',
          ruleName: 'Alert for New Tire Quotation',
          condition: {
            operator: 'OR',
            expressions: [
              { field: 'tire_problem_type', op: 'eq', value: 'buy_new_tire' },
              { field: 'spare_tire_available', op: 'eq', value: false },
            ],
          },
          actions: [
            {
              type: 'SHOW_ALERT',
              messageAr: 'سيقوم الفني بالتواصل معك لتأكيد ماركة ومقاس وسعر الإطار الجديد قبل شرائه وتركيبه عبر عرض سعر رسمي.',
              messageEn: 'Technician will verify tire brand and price with you via an official quotation before installation.',
              severity: 'info',
            },
          ],
          priority: 10,
        },
      ],
      pricingRules: [
        {
          id: 'pr_tire_base',
          ruleType: 'base',
          titleAr: 'أجرة الفحص والخدمة الأساسية',
          titleEn: 'Basic Roadside Tire Service Fee',
          calculationFormula: { fixedAmount: 10.0 },
          sortOrder: 1,
        },
      ],
      requirements: [
        {
          id: 'req_tire_base',
          requirementType: 'provider_capability',
          capabilityKey: 'tire_repair_kit',
          capabilityNameAr: 'عدة رقع وإصلاح الإطارات ومفتاح عجل هيدروليكي',
          capabilityNameEn: 'Tire Puncture Repair Kit & Hydraulic Jack',
          isRequired: true,
        },
        {
          id: 'req_tire_air',
          requirementType: 'equipment',
          capabilityKey: 'air_compressor',
          capabilityNameAr: 'ضاغط هواء متنقل (كمبريسور)',
          capabilityNameEn: 'Heavy Duty Portable Air Compressor',
          isRequired: true,
        },
      ],
    },
  ];

  // 4. Upsert services, fields, rules, pricing rules, and requirements
  for (const item of vehicleServicesData) {
    const srv = item.service;
    console.log(`📦 Upserting service: ${srv.id} (${srv.nameAr})...`);

    await db
      .insert(services)
      .values(srv)
      .onConflictDoUpdate({
        target: [services.id],
        set: {
          nameAr: srv.nameAr,
          nameEn: srv.nameEn,
          descriptionAr: srv.descriptionAr,
          descriptionEn: srv.descriptionEn,
          basePrice: srv.basePrice,
          serviceMode: srv.serviceMode,
          isLaborOnly: srv.isLaborOnly,
          startingPriceLabelAr: srv.startingPriceLabelAr,
          startingPriceLabelEn: srv.startingPriceLabelEn,
          disclaimerAr: srv.disclaimerAr,
          disclaimerEn: srv.disclaimerEn,
          isActive: true,
          isPublished: true,
          status: 'published',
          updatedAt: new Date(),
        },
      });

    // Delete existing sub-definitions to refresh cleanly
    await db.delete(serviceFields).where(eq(serviceFields.serviceId, srv.id));
    await db.delete(serviceRules).where(eq(serviceRules.serviceId, srv.id));
    await db.delete(servicePricingRules).where(eq(servicePricingRules.serviceId, srv.id));
    await db.delete(serviceRequirements).where(eq(serviceRequirements.serviceId, srv.id));

    // Insert Fields
    if (item.fields && item.fields.length > 0) {
      const fieldRows = item.fields.map((f: any) => ({
        ...f,
        serviceId: srv.id,
      }));
      await db.insert(serviceFields).values(fieldRows);
    }

    // Insert Rules
    if (item.rules && item.rules.length > 0) {
      const ruleRows = item.rules.map((r: any) => ({
        ...r,
        serviceId: srv.id,
      }));
      await db.insert(serviceRules).values(ruleRows);
    }

    // Insert Pricing Rules
    if (item.pricingRules && item.pricingRules.length > 0) {
      const prRows = item.pricingRules.map((pr: any) => ({
        ...pr,
        serviceId: srv.id,
      }));
      await db.insert(servicePricingRules).values(prRows);
    }

    // Insert Requirements
    if (item.requirements && item.requirements.length > 0) {
      const reqRows = item.requirements.map((rq: any) => ({
        ...rq,
        serviceId: srv.id,
      }));
      await db.insert(serviceRequirements).values(reqRows);
    }

    // Insert initial version snapshot
    await db
      .insert(serviceVersions)
      .values({
        id: `ver_${srv.id}_v1`,
        serviceId: srv.id,
        version: 1,
        schemaSnapshot: {
          service: srv,
          fields: item.fields,
          rules: item.rules,
          pricingRules: item.pricingRules,
          requirements: item.requirements,
          options: [],
        },
        changelog: 'Phase 7: Production Vehicle & Roadside Service Initialization',
      })
      .onConflictDoNothing();

    // Link service to all active providers
    for (const prov of activeProviders) {
      await db
        .insert(providerServices)
        .values({
          providerId: prov.id,
          serviceId: srv.id,
          isAvailable: true,
        })
        .onConflictDoNothing();
    }
  }

  // 5. Equip providers with vehicle capabilities
  const vehicleCapabilitiesList = [
    'towing_truck',
    'flatbed_towing',
    'heavy_towing',
    'roadside_mechanic',
    'diagnostic_scanner',
    'battery_jump_starter',
    'mobile_ev_charger',
    'ev_connector_type2',
    'ev_connector_ccs2',
    'ev_connector_gbt',
    'tire_repair_kit',
    'air_compressor',
    'mobile_tire_changer',
  ];

  for (const prov of activeProviders) {
    for (const cap of vehicleCapabilitiesList) {
      await db
        .insert(providerCapabilities)
        .values({
          providerId: prov.id,
          capabilityKey: cap,
          isVerified: true,
        })
        .onConflictDoNothing();
    }
  }

  console.log('🎉 [PHASE 7 MIGRATION] All 4 Vehicle & Roadside Services and Capabilities successfully initialized!');
}

if (process.argv[1]?.endsWith('apply_phase7_vehicle_migration.ts')) {
  applyPhase7VehicleMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

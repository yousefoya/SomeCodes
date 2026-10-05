import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  numeric,
  integer,
  jsonb,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { serviceCategories } from './categories.schema';
import { providers, providerServices } from './providers.schema';
import { users } from './users.schema';

/**
 * Service Type Enum
 */
export const serviceTypeEnum = pgEnum('service_type', ['delivery_product', 'home_service']);

/**
 * Service Lifecycle Status Enum
 */
export const serviceStatusEnum = pgEnum('service_status', [
  'draft',
  'in_review',
  'published',
  'archived',
]);

/**
 * Generic Service Field Type Enum
 */
export const serviceFieldTypeEnum = pgEnum('service_field_type', [
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
]);

/**
 * Generic Pricing Rule Type Enum
 */
export const pricingRuleTypeEnum = pgEnum('pricing_rule_type', [
  'base',
  'field_addon',
  'field_multiplier',
  'option_surcharge',
  'tiered_volume',
  'step_increment',
  'conditional_formula',
]);

/**
 * Services and Products Table (Extended with Generic Metadata & Versioning)
 */
export const services = pgTable(
  'services',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    categoryId: varchar('category_id', { length: 50 })
      .notNull()
      .references(() => serviceCategories.id, { onDelete: 'restrict' }),
    providerId: varchar('provider_id', { length: 50 })
      .references(() => providers.id, { onDelete: 'set null' }),
    nameAr: varchar('name_ar', { length: 150 }).notNull(),
    nameEn: varchar('name_en', { length: 150 }).notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    type: serviceTypeEnum('type').notNull(),
    basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
    unitAr: varchar('unit_ar', { length: 30 }).notNull(),
    unitEn: varchar('unit_en', { length: 30 }).notNull(),
    requiresQuotation: boolean('requires_quotation').default(false).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    // Dynamic Service Engine Metadata
    status: serviceStatusEnum('status').default('published').notNull(),
    currentVersion: integer('current_version').default(1).notNull(),
    slaHours: integer('sla_hours').default(24).notNull(),
    minOrderValue: numeric('min_order_value', { precision: 10, scale: 2 }),
    maxOrderValue: numeric('max_order_value', { precision: 10, scale: 2 }),
    gallery: jsonb('gallery').$type<string[]>().default([]).notNull(),
    coverageAreas: jsonb('coverage_areas').$type<string[]>().default([]).notNull(),
    draftSchema: jsonb('draft_schema').$type<Record<string, any>>(),
    isPublished: boolean('is_published').default(true).notNull(),

    // Phase 4: Labor & Service Category Controls
    startingPriceLabelAr: varchar('starting_price_label_ar', { length: 100 }).default('يبدأ من'),
    startingPriceLabelEn: varchar('starting_price_label_en', { length: 100 }).default('Starting from'),
    disclaimerAr: text('disclaimer_ar').default('السعر الظاهر هو أجرة اليد/الخدمة الأساسية فقط، ولا يشمل قطع الغيار أو المواد أو المعدات أو أي أعمال إضافية قد تكون مطلوبة.'),
    disclaimerEn: text('disclaimer_en').default('The displayed price is the labor/service starting fee only. It does not include spare parts, materials, equipment, or additional work that may be required.'),
    isLaborOnly: boolean('is_labor_only').default(false).notNull(),
    serviceMode: varchar('service_mode', { length: 50 }).default('dynamic_form').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_services_category').on(table.categoryId),
    index('idx_services_active_available').on(table.isActive, table.isAvailable),
    index('idx_services_cat_active_avail').on(table.categoryId, table.isActive, table.isAvailable),
    index('idx_services_type').on(table.type),
    index('idx_services_status').on(table.status),
    index('idx_services_published').on(table.isPublished),
  ]
);

/**
 * Service Options and Product Variants Table (Legacy & Variant support)
 */
export const serviceOptions = pgTable(
  'service_options',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    nameAr: varchar('name_ar', { length: 150 }).notNull(),
    nameEn: varchar('name_en', { length: 150 }).notNull(),
    optionType: varchar('option_type', { length: 50 }).default('variant').notNull(),
    size: varchar('size', { length: 50 }),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    unitAr: varchar('unit_ar', { length: 30 }).notNull(),
    unitEn: varchar('unit_en', { length: 30 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    // Phase 4: Product Specifications, Installation & Package Additions
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    imageUrl: text('image_url'),
    gallery: jsonb('gallery').$type<string[]>().default([]).notNull(),
    brand: varchar('brand', { length: 100 }),
    color: varchar('color', { length: 50 }),
    specifications: jsonb('specifications').$type<Record<string, any>>().default({}).notNull(),
    installationPrice: numeric('installation_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    packageWorkerCount: integer('package_worker_count'),
    packageDurationHours: numeric('package_duration_hours', { precision: 10, scale: 2 }),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_options_service').on(table.serviceId),
    index('idx_service_options_active').on(table.isActive, table.isAvailable),
    index('idx_service_options_srv_active_avail').on(table.serviceId, table.isActive, table.isAvailable),
    index('idx_service_options_sort').on(table.sortOrder),
  ]
);

/**
 * Generic Service Fields Table (Customer Input Questions & UI Controls)
 */
export const serviceFields = pgTable(
  'service_fields',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 100 }).notNull(),
    labelAr: varchar('label_ar', { length: 150 }).notNull(),
    labelEn: varchar('label_en', { length: 150 }).notNull(),
    fieldType: serviceFieldTypeEnum('field_type').notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    placeholderAr: varchar('placeholder_ar', { length: 150 }),
    placeholderEn: varchar('placeholder_en', { length: 150 }),
    helpTextAr: text('help_text_ar'),
    helpTextEn: text('help_text_en'),
    defaultValue: jsonb('default_value'),
    min: numeric('min', { precision: 10, scale: 2 }),
    max: numeric('max', { precision: 10, scale: 2 }),
    step: numeric('step', { precision: 10, scale: 2 }),
    unitAr: varchar('unit_ar', { length: 30 }),
    unitEn: varchar('unit_en', { length: 30 }),
    options: jsonb('options').$type<Array<{
      id: string;
      labelAr: string;
      labelEn: string;
      value: any;
      priceModifier?: number;
      icon?: string;
    }>>().default([]).notNull(),
    validationRules: jsonb('validation_rules').$type<{
      required?: boolean;
      min?: number;
      max?: number;
      step?: number;
      pattern?: string;
      minSelect?: number;
      maxSelect?: number;
      allowedExtensions?: string[];
      maxPhotos?: number;
    }>().default({}).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isRequired: boolean('is_required').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isSearchable: boolean('is_searchable').default(false).notNull(),
    isFilterable: boolean('is_filterable').default(false).notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_fields_service').on(table.serviceId),
    uniqueIndex('idx_service_fields_service_key').on(table.serviceId, table.key),
    index('idx_service_fields_sort').on(table.serviceId, table.sortOrder),
    index('idx_service_fields_active').on(table.serviceId, table.isActive),
  ]
);

/**
 * Generic Declarative Service Rules Table (IF / THEN Conditions & Actions)
 */
export const serviceRules = pgTable(
  'service_rules',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    ruleName: varchar('rule_name', { length: 150 }).notNull(),
    description: text('description'),
    condition: jsonb('condition').$type<{
      operator: 'AND' | 'OR';
      expressions: Array<{
        field: string;
        op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'is_empty' | 'is_not_empty';
        value: any;
      }>;
    }>().notNull(),
    actions: jsonb('actions').$type<Array<{
      type: 'SHOW_FIELD' | 'HIDE_FIELD' | 'REQUIRE_FIELD' | 'UNREQUIRE_FIELD' | 'SHOW_ALERT' | 'REQUIRE_CAPABILITY';
      targetField?: string;
      messageAr?: string;
      messageEn?: string;
      severity?: 'info' | 'warning' | 'error';
      capabilityKey?: string;
      payload?: any;
    }>>().notNull(),
    priority: integer('priority').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_rules_service').on(table.serviceId),
    index('idx_service_rules_priority').on(table.serviceId, table.priority),
    index('idx_service_rules_active').on(table.serviceId, table.isActive),
  ]
);

/**
 * Generic Service Pricing Rules Table (Formulas, Modifiers, Surcharges)
 */
export const servicePricingRules = pgTable(
  'service_pricing_rules',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    ruleType: pricingRuleTypeEnum('rule_type').notNull(),
    titleAr: varchar('title_ar', { length: 150 }).notNull(),
    titleEn: varchar('title_en', { length: 150 }).notNull(),
    targetField: varchar('target_field', { length: 100 }),
    calculationFormula: jsonb('calculation_formula').$type<{
      fixedAmount?: number;
      ratePerUnit?: number;
      multiplier?: number;
      multiplierField?: string;
      baseThreshold?: number;
      threshold?: number;
      stepSize?: number;
      stepRate?: number;
      percentageDiscount?: number;
      tiers?: Array<{ min: number; max?: number; rate: number }>;
    }>().notNull(),
    condition: jsonb('condition').$type<{
      operator: 'AND' | 'OR';
      expressions: Array<{
        field: string;
        op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'is_empty' | 'is_not_empty';
        value: any;
      }>;
    }>(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_pricing_rules_service').on(table.serviceId),
    index('idx_service_pricing_rules_sort').on(table.serviceId, table.sortOrder),
    index('idx_service_pricing_rules_active').on(table.serviceId, table.isActive),
  ]
);

/**
 * Generic Service Requirements Table (Provider & Delivery Capabilities)
 */
export const serviceRequirements = pgTable(
  'service_requirements',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    requirementType: varchar('requirement_type', { length: 50 }).notNull(), // 'provider_capability' | 'delivery_capability' | 'equipment' | 'certification'
    capabilityKey: varchar('capability_key', { length: 100 }).notNull(),
    capabilityNameAr: varchar('capability_name_ar', { length: 150 }).notNull(),
    capabilityNameEn: varchar('capability_name_en', { length: 150 }).notNull(),
    isRequired: boolean('is_required').default(true).notNull(),
    condition: jsonb('condition'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_reqs_service').on(table.serviceId),
    index('idx_service_reqs_cap_key').on(table.serviceId, table.capabilityKey),
    index('idx_service_reqs_active').on(table.serviceId, table.isRequired),
  ]
);

/**
 * Service Versions Table (Immutable Historical Schema Snapshots)
 */
export const serviceVersions = pgTable(
  'service_versions',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    schemaSnapshot: jsonb('schema_snapshot').$type<{
      service: any;
      fields: any[];
      rules: any[];
      pricingRules: any[];
      requirements: any[];
      options: any[];
    }>().notNull(),
    publishedByUserId: uuid('published_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    publishedByName: varchar('published_by_name', { length: 150 }),
    changelog: text('changelog'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_versions_service').on(table.serviceId),
    uniqueIndex('idx_service_versions_srv_ver').on(table.serviceId, table.version),
    index('idx_service_versions_created').on(table.createdAt),
  ]
);

// Relationships
export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  provider: one(providers, {
    fields: [services.providerId],
    references: [providers.id],
  }),
  providers: many(providerServices),
  options: many(serviceOptions),
  fields: many(serviceFields),
  rules: many(serviceRules),
  pricingRules: many(servicePricingRules),
  requirements: many(serviceRequirements),
  versions: many(serviceVersions),
}));

export const serviceOptionsRelations = relations(serviceOptions, ({ one }) => ({
  service: one(services, {
    fields: [serviceOptions.serviceId],
    references: [services.id],
  }),
}));

export const serviceFieldsRelations = relations(serviceFields, ({ one }) => ({
  service: one(services, {
    fields: [serviceFields.serviceId],
    references: [services.id],
  }),
}));

export const serviceRulesRelations = relations(serviceRules, ({ one }) => ({
  service: one(services, {
    fields: [serviceRules.serviceId],
    references: [services.id],
  }),
}));

export const servicePricingRulesRelations = relations(servicePricingRules, ({ one }) => ({
  service: one(services, {
    fields: [servicePricingRules.serviceId],
    references: [services.id],
  }),
}));

export const serviceRequirementsRelations = relations(serviceRequirements, ({ one }) => ({
  service: one(services, {
    fields: [serviceRequirements.serviceId],
    references: [services.id],
  }),
}));

export const serviceVersionsRelations = relations(serviceVersions, ({ one }) => ({
  service: one(services, {
    fields: [serviceVersions.serviceId],
    references: [services.id],
  }),
  publishedByUser: one(users, {
    fields: [serviceVersions.publishedByUserId],
    references: [users.id],
  }),
}));

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceOption = typeof serviceOptions.$inferSelect;
export type NewServiceOption = typeof serviceOptions.$inferInsert;
export type ServiceField = typeof serviceFields.$inferSelect;
export type NewServiceField = typeof serviceFields.$inferInsert;
export type ServiceRule = typeof serviceRules.$inferSelect;
export type NewServiceRule = typeof serviceRules.$inferInsert;
export type ServicePricingRule = typeof servicePricingRules.$inferSelect;
export type NewServicePricingRule = typeof servicePricingRules.$inferInsert;
export type ServiceRequirement = typeof serviceRequirements.$inferSelect;
export type NewServiceRequirement = typeof serviceRequirements.$inferInsert;
export type ServiceVersion = typeof serviceVersions.$inferSelect;
export type NewServiceVersion = typeof serviceVersions.$inferInsert;

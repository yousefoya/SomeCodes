import { pgTable, text, varchar, timestamp, boolean, doublePrecision, numeric, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { serviceCategories } from './categories.schema';
import { services } from './services.schema';

/**
 * Providers / Distribution Facilities Table
 */
export const providers = pgTable(
  'providers',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    nameAr: varchar('name_ar', { length: 150 }).notNull(),
    nameEn: varchar('name_en', { length: 150 }).notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    logo: text('logo'),
    phoneNumber: varchar('phone_number', { length: 15 }).notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    operatingHours: varchar('operating_hours', { length: 100 }).default('08:00 AM - 10:00 PM').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(), // Online / Offline toggle
    rating: doublePrecision('rating').default(5.0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_providers_user').on(table.userId),
    index('idx_providers_active').on(table.isActive),
    index('idx_providers_available').on(table.isAvailable),
    index('idx_providers_active_available').on(table.isActive, table.isAvailable),
    index('idx_providers_coords').on(table.latitude, table.longitude),
  ]
);

/**
 * Many-to-Many relationship between Providers and Catalog Services (Authoritative)
 */
export const providerServices = pgTable(
  'provider_services',
  {
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    isAvailable: boolean('is_available').default(true).notNull(),
    providerPrice: numeric('provider_price', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.providerId, table.serviceId] }),
    index('idx_prov_srv_service').on(table.serviceId),
    index('idx_prov_srv_provider').on(table.providerId),
    index('idx_prov_srv_service_avail').on(table.serviceId, table.isAvailable),
    index('idx_prov_srv_provider_avail').on(table.providerId, table.isAvailable),
  ]
);

/**
 * Many-to-Many relationship between Providers and Service Categories
 */
export const providerServiceCategories = pgTable(
  'provider_service_categories',
  {
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 50 })
      .notNull()
      .references(() => serviceCategories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.providerId, table.categoryId] }),
    index('idx_prov_cat_category').on(table.categoryId),
  ]
);

/**
 * Provider Coverage Areas Table
 */
export const providerCoverageAreas = pgTable(
  'provider_coverage_areas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    areaName: varchar('area_name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prov_coverage_provider').on(table.providerId),
    index('idx_prov_coverage_area').on(table.areaName),
  ]
);

export const providersRelations = relations(providers, ({ many }) => ({
  services: many(providerServices),
  categories: many(providerServiceCategories),
  coverageAreas: many(providerCoverageAreas),
}));

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(providers, {
    fields: [providerServices.providerId],
    references: [providers.id],
  }),
  service: one(services, {
    fields: [providerServices.serviceId],
    references: [services.id],
  }),
}));

export const providerServiceCategoriesRelations = relations(providerServiceCategories, ({ one }) => ({
  provider: one(providers, {
    fields: [providerServiceCategories.providerId],
    references: [providers.id],
  }),
  category: one(serviceCategories, {
    fields: [providerServiceCategories.categoryId],
    references: [serviceCategories.id],
  }),
}));

export const providerCoverageAreasRelations = relations(providerCoverageAreas, ({ one }) => ({
  provider: one(providers, {
    fields: [providerCoverageAreas.providerId],
    references: [providers.id],
  }),
}));

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type ProviderService = typeof providerServices.$inferSelect;
export type NewProviderService = typeof providerServices.$inferInsert;
export type ProviderCoverageArea = typeof providerCoverageAreas.$inferSelect;
export type NewProviderCoverageArea = typeof providerCoverageAreas.$inferInsert;

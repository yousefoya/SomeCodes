import { pgTable, text, varchar, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';

/**
 * Service Categories Table (e.g. Products & Needs, Home Services, Offers)
 */
export const serviceCategories = pgTable(
  'service_categories',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    nameAr: varchar('name_ar', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }).notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    iconName: varchar('icon_name', { length: 50 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_categories_active_order').on(table.isActive, table.sortOrder),
  ]
);

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;

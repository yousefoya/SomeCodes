import { pgTable, text, varchar, timestamp, boolean, integer, numeric, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

/**
 * Coupon Discount Type Enum
 */
export const couponTypeEnum = pgEnum('coupon_type', ['percentage', 'fixed_amount']);

/**
 * Promotional Coupons Table
 */
export const coupons = pgTable(
  'coupons',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    type: couponTypeEnum('type').notNull(),
    value: numeric('value', { precision: 10, scale: 2 }).notNull(),
    minOrderValue: numeric('min_order_value', { precision: 10, scale: 2 }).default('0.00').notNull(),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    usageLimit: integer('usage_limit').default(1000).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_coupons_code_active').on(table.code, table.isActive),
    index('idx_coupons_code_active_expiry').on(table.code, table.isActive, table.expiryDate),
  ]
);

/**
 * Coupon Usages Log Table (Per-User & Per-Order tracking)
 */
export const couponUsages = pgTable(
  'coupon_usages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    couponId: varchar('coupon_id', { length: 50 })
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: varchar('order_id', { length: 50 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_coupon_usage_user').on(table.userId, table.couponId),
    index('idx_coupon_usage_order').on(table.orderId),
  ]
);

/**
 * Promotional Banners and Offers Table
 */
export const offers = pgTable(
  'offers',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    titleAr: varchar('title_ar', { length: 150 }).notNull(),
    titleEn: varchar('title_en', { length: 150 }).notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    discountPercentage: numeric('discount_percentage', { precision: 5, scale: 2 }).notNull(),
    promoCode: varchar('promo_code', { length: 50 }),
    bannerColor: varchar('banner_color', { length: 30 }),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_offers_active_dates').on(table.isActive, table.startDate, table.endDate),
  ]
);

export const couponsRelations = relations(coupons, ({ many }) => ({
  usages: many(couponUsages),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsages.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponUsages.userId],
    references: [users.id],
  }),
}));

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponUsage = typeof couponUsages.$inferSelect;
export type NewCouponUsage = typeof couponUsages.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

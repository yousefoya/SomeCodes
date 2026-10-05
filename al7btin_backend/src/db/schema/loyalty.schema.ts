import { pgTable, text, varchar, timestamp, boolean, integer, numeric, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { orders } from './orders.schema';

/**
 * Loyalty Program Global Settings & Rewards Configuration
 * Admin can adjust the required points (e.g. 200) and reward value (e.g. 5.00 JOD coupon)
 */
export const loyaltySettings = pgTable('loyalty_settings', {
  id: varchar('id', { length: 50 }).primaryKey(), // 'default_loyalty_settings'
  requiredPoints: integer('required_points').default(200).notNull(),
  rewardType: varchar('reward_type', { length: 50 }).default('coupon').notNull(),
  rewardValue: numeric('reward_value', { precision: 10, scale: 2 }).default('5.00').notNull(),
  titleAr: varchar('title_ar', { length: 200 }).default('خصم 5 د.أ مقابل 200 نقطة ولاء').notNull(),
  titleEn: varchar('title_en', { length: 200 }).default('5 JOD Discount for 200 Loyalty Points').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Customer Loyalty Points Transactions History
 * Source of truth for earned and redeemed points
 */
export const loyaltyTransactions = pgTable(
  'loyalty_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: varchar('order_id', { length: 50 }).references(() => orders.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 50 }).notNull(), // 'order_reward', 'redemption', 'manual_adjustment'
    points: integer('points').notNull(), // +10 for completed order, -200 for redemption
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_loyalty_user').on(table.userId),
    index('idx_loyalty_order').on(table.orderId),
    index('idx_loyalty_created').on(table.createdAt),
    // Prevent duplicate reward for the same completed order
    uniqueIndex('idx_loyalty_user_order_reward').on(table.userId, table.orderId, table.type),
  ]
);

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyTransactions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [loyaltyTransactions.orderId],
    references: [orders.id],
  }),
}));

export type LoyaltySettings = typeof loyaltySettings.$inferSelect;
export type NewLoyaltySettings = typeof loyaltySettings.$inferInsert;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type NewLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;

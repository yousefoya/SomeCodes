import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema.js';
import { orders } from './orders.schema.js';
import { providers } from './providers.schema.js';
import { services } from './services.schema.js';

/**
 * Customer Order Reviews & Ratings Table
 * Ensures verified purchases, single review per order, and transparent customer feedback.
 */
export const orderReviews = pgTable(
  'order_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id', { length: 50 })
      .references(() => services.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(), // 1 to 5 stars
    comment: text('comment'),
    isVerifiedPurchase: boolean('is_verified_purchase').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_order_reviews_order_unique').on(table.orderId),
    index('idx_order_reviews_provider').on(table.providerId),
    index('idx_order_reviews_customer').on(table.customerId),
    index('idx_order_reviews_rating').on(table.rating),
    index('idx_order_reviews_created').on(table.createdAt),
  ]
);

export const orderReviewsRelations = relations(orderReviews, ({ one }) => ({
  order: one(orders, {
    fields: [orderReviews.orderId],
    references: [orders.id],
  }),
  customer: one(users, {
    fields: [orderReviews.customerId],
    references: [users.id],
  }),
  provider: one(providers, {
    fields: [orderReviews.providerId],
    references: [providers.id],
  }),
  service: one(services, {
    fields: [orderReviews.serviceId],
    references: [services.id],
  }),
}));

export type OrderReview = typeof orderReviews.$inferSelect;
export type NewOrderReview = typeof orderReviews.$inferInsert;

import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  doublePrecision,
  integer,
  numeric,
  uuid,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders.schema.js';
import { providers } from './providers.schema.js';

/**
 * Dispatch Offer Status Enum
 */
export const dispatchOfferStatusEnum = pgEnum('dispatch_offer_status', [
  'offered',
  'accepted',
  'rejected',
  'expired',
  'cancelled',
]);

/**
 * Dispatch Offers Table (Multi-candidate offer lifecycle and scoring audit trail)
 */
export const dispatchOffers = pgTable(
  'dispatch_offers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').default(1).notNull(),
    status: dispatchOfferStatusEnum('status').default('offered').notNull(),
    score: doublePrecision('score').notNull(),
    scoreBreakdown: jsonb('score_breakdown').$type<{
      distanceKm?: number;
      distanceScore: number;
      ratingScore: number;
      workloadScore: number;
      capabilityScore: number;
      acceptanceRateScore: number;
      totalScore: number;
      weights: {
        distance: number;
        rating: number;
        workload: number;
        capability: number;
        acceptanceRate: number;
      };
      matchedCapabilities?: string[];
      missingCapabilities?: string[];
      eligibilityReasons?: string[];
    }>().notNull(),
    offeredAt: timestamp('offered_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_dispatch_offers_order').on(table.orderId),
    index('idx_dispatch_offers_provider').on(table.providerId),
    index('idx_dispatch_offers_status').on(table.status),
    index('idx_dispatch_offers_expires').on(table.expiresAt),
    index('idx_dispatch_offers_order_status').on(table.orderId, table.status),
  ]
);

/**
 * Provider Granular Capabilities Table
 * (Maps specific capabilities like 'heavy_truck', '4_worker_team', 'hvac_technician', 'female_cleaning_staff')
 */
export const providerCapabilities = pgTable(
  'provider_capabilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    capabilityKey: varchar('capability_key', { length: 100 }).notNull(),
    isVerified: boolean('is_verified').default(true).notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prov_caps_provider').on(table.providerId),
    index('idx_prov_caps_key').on(table.capabilityKey),
    index('idx_prov_caps_prov_key').on(table.providerId, table.capabilityKey),
  ]
);

/**
 * Dispatch Engine Operational Settings Table (Admin-Configurable)
 */
export const dispatchSettings = pgTable(
  'dispatch_settings',
  {
    id: varchar('id', { length: 50 }).primaryKey().default('default'),
    offerTimeoutSeconds: integer('offer_timeout_seconds').default(90).notNull(),
    maxRetryAttempts: integer('max_retry_attempts').default(3).notNull(),
    autoDispatchEnabled: boolean('auto_dispatch_enabled').default(true).notNull(),
    distanceWeight: doublePrecision('distance_weight').default(0.30).notNull(),
    ratingWeight: doublePrecision('rating_weight').default(0.25).notNull(),
    workloadWeight: doublePrecision('workload_weight').default(0.20).notNull(),
    capabilityWeight: doublePrecision('capability_weight').default(0.15).notNull(),
    acceptanceRateWeight: doublePrecision('acceptance_rate_weight').default(0.10).notNull(),
    maxServiceRadiusKm: doublePrecision('max_service_radius_km').default(35.0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// Relationships
export const dispatchOffersRelations = relations(dispatchOffers, ({ one }) => ({
  order: one(orders, {
    fields: [dispatchOffers.orderId],
    references: [orders.id],
  }),
  provider: one(providers, {
    fields: [dispatchOffers.providerId],
    references: [providers.id],
  }),
}));

export const providerCapabilitiesRelations = relations(providerCapabilities, ({ one }) => ({
  provider: one(providers, {
    fields: [providerCapabilities.providerId],
    references: [providers.id],
  }),
}));

export type DispatchOffer = typeof dispatchOffers.$inferSelect;
export type NewDispatchOffer = typeof dispatchOffers.$inferInsert;
export type ProviderCapability = typeof providerCapabilities.$inferSelect;
export type NewProviderCapability = typeof providerCapabilities.$inferInsert;
export type DispatchSetting = typeof dispatchSettings.$inferSelect;
export type NewDispatchSetting = typeof dispatchSettings.$inferInsert;

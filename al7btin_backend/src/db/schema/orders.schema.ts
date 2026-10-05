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
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { serviceCategories } from './categories.schema';
import { services } from './services.schema';
import { providers } from './providers.schema';
import { deliveryEmployees, deliveryAssignmentStatusEnum } from './delivery.schema';
import { coupons } from './coupons.schema';

/**
 * Order Lifecycle Status Enum
 */
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'offered_to_driver',
  'awaiting_assignment',
  'assigned',
  'accepted',
  'going_to_pickup',
  'picked_up',
  'going_to_customer',
  'completed',
  'failed',
  'cancelled',
  'rejected',
]);

/**
 * Orders Table
 */
export const orders = pgTable(
  'orders',
  {
    id: varchar('id', { length: 50 }).primaryKey(), // e.g. 'ORD-12345'
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    customerName: varchar('customer_name', { length: 100 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 15 }).notNull(),
    serviceCategoryId: varchar('service_category_id', { length: 50 })
      .notNull()
      .references(() => serviceCategories.id, { onDelete: 'restrict' }),

    // Provider Facility Snapshot
    providerId: varchar('provider_id', { length: 50 })
      .references(() => providers.id, { onDelete: 'set null' }),
    providerName: varchar('provider_name', { length: 150 }),
    providerPhone: varchar('provider_phone', { length: 15 }),
    pickupAddress: text('pickup_address'),
    pickupLatitude: doublePrecision('pickup_latitude'),
    pickupLongitude: doublePrecision('pickup_longitude'),

    // Delivery Location Snapshot
    deliveryCity: varchar('delivery_city', { length: 50 }).default('عمان').notNull(),
    deliveryArea: varchar('delivery_area', { length: 100 }).notNull(),
    deliveryStreetAddress: text('delivery_street_address').notNull(),
    deliveryBuilding: varchar('delivery_building', { length: 30 }),
    deliveryFloor: varchar('delivery_floor', { length: 20 }),
    deliveryApartment: varchar('delivery_apartment', { length: 20 }),
    deliveryInstructions: text('delivery_instructions'),
    deliveryLatitude: doublePrecision('delivery_latitude').notNull(),
    deliveryLongitude: doublePrecision('delivery_longitude').notNull(),

    // Financial Breakdown (Server Source of Truth)
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).default('0.00').notNull(), // Zero Delivery Fee
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    couponId: varchar('coupon_id', { length: 50 })
      .references(() => coupons.id, { onDelete: 'set null' }),
    paymentMethod: varchar('payment_method', { length: 50 }).default('cash_on_delivery').notNull(),

    // Dispatch & Lifecycle State
    status: orderStatusEnum('status').default('confirmed').notNull(),
    assignmentStatus: deliveryAssignmentStatusEnum('assignment_status').default('unassigned').notNull(),
    offeredToDriverId: varchar('offered_to_driver_id', { length: 50 })
      .references(() => deliveryEmployees.id, { onDelete: 'set null' }),
    offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
    rejectedDriverIds: text('rejected_driver_ids').array().default([]).notNull(),
    assignedDeliveryId: varchar('assigned_delivery_id', { length: 50 })
      .references(() => deliveryEmployees.id, { onDelete: 'set null' }),
    assignedDeliveryName: varchar('assigned_delivery_name', { length: 100 }),

    // Phase 5: Provider Dispatch, Escalation & Service Execution Tracking
    isEscalated: boolean('is_escalated').default(false).notNull(),
    escalationReason: text('escalation_reason'),
    escalatedAt: timestamp('escalated_at', { withTimezone: true }),
    dispatchAttempt: integer('dispatch_attempt').default(0).notNull(),
    arrivedAt: timestamp('arrived_at', { withTimezone: true }),
    serviceStartedAt: timestamp('service_started_at', { withTimezone: true }),
    serviceCompletedAt: timestamp('service_completed_at', { withTimezone: true }),

    // Phase 7: Vehicle & Roadside Trips, Destination & Cancellation Lifecycle
    destinationAddress: text('destination_address'),
    destinationLatitude: doublePrecision('destination_latitude'),
    destinationLongitude: doublePrecision('destination_longitude'),
    tripDistanceKm: numeric('trip_distance_km', { precision: 10, scale: 2 }),
    cancellationReason: text('cancellation_reason'),
    cancelledByUserId: uuid('cancelled_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    // Idempotency support to prevent duplicate charge / order submission
    idempotencyKey: varchar('idempotency_key', { length: 128 }),

    // Dynamic Service Engine Snapshots (Immutable Audit Trail)
    configurationSnapshot: jsonb('configuration_snapshot').$type<{
      serviceId: string;
      serviceVersion: number;
      serviceNameAr: string;
      serviceNameEn: string;
      answers: Record<string, any>;
      selectedOption?: any;
      evaluatedFields?: any[];
      activeAlerts?: any[];
      customerNotes?: string;
      customerImages?: string[];
      createdAt: string;
    }>(),
    priceBreakdown: jsonb('price_breakdown').$type<{
      basePrice: number;
      subtotal: number;
      lineItems: Array<{
        titleAr: string;
        titleEn: string;
        type: string;
        amount: number;
        quantity?: number;
        unit?: string;
      }>;
      fieldAddons: Array<{
        fieldKey: string;
        labelAr: string;
        labelEn: string;
        calculation: string;
        amount: number;
      }>;
      optionSurcharges: Array<{
        optionId: string;
        nameAr: string;
        nameEn: string;
        amount: number;
      }>;
      discounts: Array<{
        code?: string;
        type: string;
        amount: number;
      }>;
      discountAmount: number;
      deliveryFee: number;
      totalAmount: number;
    }>(),
    serviceVersion: integer('service_version').default(1),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_orders_customer').on(table.customerId),
    index('idx_orders_customer_created').on(table.customerId, table.createdAt),
    index('idx_orders_provider_status').on(table.providerId, table.status),
    index('idx_orders_status_created').on(table.status, table.createdAt),
    index('idx_orders_status').on(table.status),
    index('idx_orders_created').on(table.createdAt),
    index('idx_orders_assigned_driver').on(table.assignedDeliveryId),
    index('idx_orders_offered_driver').on(table.offeredToDriverId),
    index('idx_orders_service_cat').on(table.serviceCategoryId),
    index('idx_orders_service_cat_status').on(table.serviceCategoryId, table.status),
    index('idx_orders_provider').on(table.providerId),
    uniqueIndex('idx_orders_customer_idempotency').on(table.customerId, table.idempotencyKey),
  ]
);

/**
 * Order Items Table (Frozen snapshot of items & unit prices at purchase)
 */
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    serviceOptionId: varchar('service_option_id', { length: 50 }),
    variantNameAr: varchar('variant_name_ar', { length: 150 }),
    variantNameEn: varchar('variant_name_en', { length: 150 }),
    titleAr: varchar('title_ar', { length: 150 }).notNull(),
    titleEn: varchar('title_en', { length: 150 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    itemTotal: numeric('item_total', { precision: 10, scale: 2 }).notNull(),
    unitAr: varchar('unit_ar', { length: 30 }),
    unitEn: varchar('unit_en', { length: 30 }),
    isHomeService: boolean('is_home_service').default(false).notNull(),
    notes: text('notes'),
  },
  (table) => [
    index('idx_order_items_order').on(table.orderId),
    index('idx_order_items_service').on(table.serviceId),
    index('idx_order_items_option').on(table.serviceOptionId),
    index('idx_order_items_order_service').on(table.orderId, table.serviceId),
  ]
);

/**
 * Order Status Audit History Table
 */
export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: orderStatusEnum('status').notNull(),
    changedByUserId: uuid('changed_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_order_history_order').on(table.orderId),
    index('idx_order_history_created').on(table.createdAt),
  ]
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  category: one(serviceCategories, {
    fields: [orders.serviceCategoryId],
    references: [serviceCategories.id],
  }),
  provider: one(providers, {
    fields: [orders.providerId],
    references: [providers.id],
  }),
  coupon: one(coupons, {
    fields: [orders.couponId],
    references: [coupons.id],
  }),
  assignedDriver: one(deliveryEmployees, {
    fields: [orders.assignedDeliveryId],
    references: [deliveryEmployees.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  service: one(services, {
    fields: [orderItems.serviceId],
    references: [services.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changedByUser: one(users, {
    fields: [orderStatusHistory.changedByUserId],
    references: [users.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

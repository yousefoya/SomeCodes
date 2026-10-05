import { pgTable, text, varchar, timestamp, boolean, doublePrecision, integer, numeric, uuid, pgEnum, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { serviceCategories } from './categories.schema';
import { services } from './services.schema';
import { providers } from './providers.schema';

/**
 * Delivery Assignment Status Enum
 */
export const deliveryAssignmentStatusEnum = pgEnum('delivery_assignment_status', [
  'unassigned',
  'offered',
  'accepted',
  'rejected',
  'expired',
  'cancelled',
]);

/**
 * Delivery Employees / Drivers Table
 */
export const deliveryEmployees = pgTable(
  'delivery_employees',
  {
    id: varchar('id', { length: 50 }).primaryKey(), // e.g. 'DRV-101'
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 15 }).notNull(),
    vehicleType: varchar('vehicle_type', { length: 50 }),
    vehiclePlateNumber: varchar('vehicle_plate_number', { length: 30 }),
    latitude: doublePrecision('latitude').default(31.9539).notNull(), // Amman Center fallback
    longitude: doublePrecision('longitude').default(35.9106).notNull(),
    isOnline: boolean('is_online').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    activeOrdersCount: integer('active_orders_count').default(0).notNull(),
    completedOrdersCount: integer('completed_orders_count').default(0).notNull(),
    rating: numeric('rating', { precision: 3, scale: 2 }).default('5.00').notNull(),
    providerId: varchar('provider_id', { length: 50 })
      .references(() => providers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_delivery_online_active').on(table.isOnline, table.isActive),
    index('idx_delivery_coords').on(table.latitude, table.longitude),
    index('idx_delivery_user').on(table.userId),
  ]
);

/**
 * Delivery Driver Category Capabilities (e.g. Products vs Home Services)
 */
export const deliveryCategoryCapabilities = pgTable(
  'delivery_category_capabilities',
  {
    deliveryEmployeeId: varchar('delivery_employee_id', { length: 50 })
      .notNull()
      .references(() => deliveryEmployees.id, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 50 })
      .notNull()
      .references(() => serviceCategories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.deliveryEmployeeId, table.categoryId] }),
    index('idx_drv_cat_category').on(table.categoryId),
  ]
);

/**
 * Granular Service-Specific Delivery Capabilities (e.g. Gas vs Water vs Diesel vs Electrical vs Plumbing)
 */
export const deliveryServiceCapabilities = pgTable(
  'delivery_service_capabilities',
  {
    deliveryEmployeeId: varchar('delivery_employee_id', { length: 50 })
      .notNull()
      .references(() => deliveryEmployees.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    isAuthorized: boolean('is_authorized').default(true).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deliveryEmployeeId, table.serviceId] }),
    index('idx_drv_srv_service').on(table.serviceId),
  ]
);

/**
 * Driver Assignment & Dispatch Lifecycle Log Table
 */
export const deliveryAssignments = pgTable(
  'delivery_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id', { length: 50 }).notNull(),
    deliveryEmployeeId: varchar('delivery_employee_id', { length: 50 })
      .notNull()
      .references(() => deliveryEmployees.id, { onDelete: 'cascade' }),
    status: deliveryAssignmentStatusEnum('status').default('offered').notNull(),
    distanceToPickupKm: numeric('distance_to_pickup_km', { precision: 6, scale: 2 }),
    rejectionReason: text('rejection_reason'),
    offeredAt: timestamp('offered_at', { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_assignments_order').on(table.orderId),
    index('idx_assignments_driver').on(table.deliveryEmployeeId),
    index('idx_assignments_status').on(table.status),
  ]
);

export const deliveryEmployeesRelations = relations(deliveryEmployees, ({ one, many }) => ({
  user: one(users, {
    fields: [deliveryEmployees.userId],
    references: [users.id],
  }),
  provider: one(providers, {
    fields: [deliveryEmployees.providerId],
    references: [providers.id],
  }),
  categoryCapabilities: many(deliveryCategoryCapabilities),
  serviceCapabilities: many(deliveryServiceCapabilities),
  assignments: many(deliveryAssignments),
}));

export const deliveryCategoryCapabilitiesRelations = relations(deliveryCategoryCapabilities, ({ one }) => ({
  driver: one(deliveryEmployees, {
    fields: [deliveryCategoryCapabilities.deliveryEmployeeId],
    references: [deliveryEmployees.id],
  }),
  category: one(serviceCategories, {
    fields: [deliveryCategoryCapabilities.categoryId],
    references: [serviceCategories.id],
  }),
}));

export const deliveryServiceCapabilitiesRelations = relations(deliveryServiceCapabilities, ({ one }) => ({
  driver: one(deliveryEmployees, {
    fields: [deliveryServiceCapabilities.deliveryEmployeeId],
    references: [deliveryEmployees.id],
  }),
  service: one(services, {
    fields: [deliveryServiceCapabilities.serviceId],
    references: [services.id],
  }),
}));

export type DeliveryEmployee = typeof deliveryEmployees.$inferSelect;
export type NewDeliveryEmployee = typeof deliveryEmployees.$inferInsert;
export type DeliveryCategoryCapability = typeof deliveryCategoryCapabilities.$inferSelect;
export type NewDeliveryCategoryCapability = typeof deliveryCategoryCapabilities.$inferInsert;
export type DeliveryServiceCapability = typeof deliveryServiceCapabilities.$inferSelect;
export type NewDeliveryServiceCapability = typeof deliveryServiceCapabilities.$inferInsert;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;
export type NewDeliveryAssignment = typeof deliveryAssignments.$inferInsert;

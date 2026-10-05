import { pgTable, text, varchar, timestamp, boolean, doublePrecision, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

/**
 * Customer Addresses Table
 */
export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 50 }).notNull(),
    city: varchar('city', { length: 50 }).default('عمان').notNull(),
    area: varchar('area', { length: 100 }).notNull(),
    streetAddress: text('street_address').notNull(),
    buildingNumber: varchar('building_number', { length: 30 }),
    floor: varchar('floor', { length: 20 }),
    apartmentNumber: varchar('apartment_number', { length: 20 }),
    deliveryInstructions: text('delivery_instructions'),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_addresses_user_default').on(table.userId, table.isDefault),
    index('idx_addresses_coords').on(table.latitude, table.longitude),
  ]
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

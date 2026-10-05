import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  uuid,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { services } from './services.schema';
import { orders } from './orders.schema';
import { providers } from './providers.schema';

/**
 * Quotation Lifecycle Status Enum
 */
export const quotationStatusEnum = pgEnum('quotation_status', [
  'draft',
  'sent',
  'customer_approved',
  'customer_rejected',
  'expired',
  'cancelled',
]);

/**
 * Quotation Line Item Interface
 */
export interface QuotationLineItem {
  id: string;
  titleAr: string;
  titleEn: string;
  type: 'labor' | 'materials' | 'spare_parts' | 'equipment' | 'additional_work';
  unitPrice: number;
  quantity: number;
  total: number;
  notes?: string;
}

/**
 * Generic Quotations Table (For on-site inspection, spare parts, additional materials & labor)
 */
export const quotations = pgTable(
  'quotations',
  {
    id: varchar('id', { length: 50 }).primaryKey(), // e.g. 'QT-1001'
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id', { length: 50 })
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    providerId: varchar('provider_id', { length: 50 })
      .references(() => providers.id, { onDelete: 'set null' }),
    createdByUserId: uuid('created_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    createdByName: varchar('created_by_name', { length: 150 }),

    status: quotationStatusEnum('status').default('draft').notNull(),

    // Financial Breakdown
    laborAmount: numeric('labor_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    materialsAmount: numeric('materials_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    sparePartsAmount: numeric('spare_parts_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    equipmentAmount: numeric('equipment_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    serviceFees: numeric('service_fees', { precision: 10, scale: 2 }).default('0.00').notNull(),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).default('0.00').notNull(), // Zero Delivery Fee invariant
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),

    // Itemized Details & Attachments
    items: jsonb('items').$type<QuotationLineItem[]>().default([]).notNull(),
    notes: text('notes'),
    attachments: jsonb('attachments').$type<string[]>().default([]).notNull(),
    customerNotes: text('customer_notes'),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_quotations_order').on(table.orderId),
    index('idx_quotations_service').on(table.serviceId),
    index('idx_quotations_provider').on(table.providerId),
    index('idx_quotations_status').on(table.status),
    index('idx_quotations_created').on(table.createdAt),
  ]
);

export const quotationsRelations = relations(quotations, ({ one }) => ({
  order: one(orders, {
    fields: [quotations.orderId],
    references: [orders.id],
  }),
  service: one(services, {
    fields: [quotations.serviceId],
    references: [services.id],
  }),
  provider: one(providers, {
    fields: [quotations.providerId],
    references: [providers.id],
  }),
  createdByUser: one(users, {
    fields: [quotations.createdByUserId],
    references: [users.id],
  }),
}));

export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;

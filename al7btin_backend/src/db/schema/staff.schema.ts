import { pgTable, text, varchar, timestamp, boolean, integer, numeric, uuid, pgEnum, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { orders } from './orders.schema';

/**
 * Support Case Status Enum
 */
export const supportCaseStatusEnum = pgEnum('support_case_status', [
  'open',
  'in_progress',
  'waiting_for_customer',
  'resolved',
  'closed',
]);

/**
 * Support Case Priority Enum
 */
export const supportCasePriorityEnum = pgEnum('support_case_priority', [
  'low',
  'normal',
  'high',
  'urgent',
]);

/**
 * Refund Request Status Enum
 */
export const refundStatusEnum = pgEnum('refund_status', [
  'requested',
  'under_review',
  'approved',
  'rejected',
  'processed',
  'failed',
]);

/**
 * Staff Profiles Table
 * Stores operational metadata, employee codes, and activity counters for all staff
 */
export const staffProfiles = pgTable(
  'staff_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    employeeCode: varchar('employee_code', { length: 50 }).unique(),
    department: varchar('department', { length: 100 }).default('Customer Support').notNull(),
    casesHandledCount: integer('cases_handled_count').default(0).notNull(),
    ordersHandledCount: integer('orders_handled_count').default(0).notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_staff_profiles_user').on(table.userId),
    index('idx_staff_profiles_code').on(table.employeeCode),
    index('idx_staff_profiles_dept').on(table.department),
  ]
);

/**
 * Customer Service Notes Table
 * Immutable internal notes recorded by staff members regarding customers or specific orders
 */
export const customerServiceNotes = pgTable(
  'customer_service_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: varchar('order_id', { length: 50 })
      .references(() => orders.id, { onDelete: 'set null' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    authorRole: varchar('author_role', { length: 50 }).notNull(),
    authorName: varchar('author_name', { length: 100 }),
    note: text('note').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_cs_notes_customer').on(table.customerId),
    index('idx_cs_notes_order').on(table.orderId),
    index('idx_cs_notes_author').on(table.authorUserId),
    index('idx_cs_notes_created').on(table.createdAt),
  ]
);

/**
 * Support Cases (Tickets) Table
 */
export const supportCases = pgTable(
  'support_cases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    caseNumber: varchar('case_number', { length: 50 }).notNull().unique(), // e.g. 'CASE-1001'
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    orderId: varchar('order_id', { length: 50 })
      .references(() => orders.id, { onDelete: 'set null' }),
    assignedStaffId: uuid('assigned_staff_id')
      .references(() => users.id, { onDelete: 'set null' }),
    createdByStaffId: uuid('created_by_staff_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 100 }).default('general').notNull(),
    status: supportCaseStatusEnum('status').default('open').notNull(),
    priority: supportCasePriorityEnum('priority').default('normal').notNull(),
    resolutionNotes: text('resolution_notes'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_support_cases_number').on(table.caseNumber),
    index('idx_support_cases_customer').on(table.customerId),
    index('idx_support_cases_order').on(table.orderId),
    index('idx_support_cases_assigned').on(table.assignedStaffId),
    index('idx_support_cases_category').on(table.category),
    index('idx_support_cases_status').on(table.status),
    index('idx_support_cases_priority').on(table.priority),
    index('idx_support_cases_created').on(table.createdAt),
  ]
);

/**
 * Refund Requests Table
 * Structured refund ledger enforcing server-side refundable amount limits & non-automatic tracking
 */
export const refundRequests = pgTable(
  'refund_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    refundNumber: varchar('refund_number', { length: 50 }).notNull().unique(), // e.g. 'REF-1001'
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    maxRefundableAmount: numeric('max_refundable_amount', { precision: 10, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    status: refundStatusEnum('status').default('requested').notNull(),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reviewedByUserId: uuid('reviewed_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    approvedByUserId: uuid('approved_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    processedByUserId: uuid('processed_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),
    gatewayReference: varchar('gateway_reference', { length: 150 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_refund_requests_number').on(table.refundNumber),
    index('idx_refund_requests_order').on(table.orderId),
    index('idx_refund_requests_customer').on(table.customerId),
    index('idx_refund_requests_status').on(table.status),
    index('idx_refund_requests_created').on(table.createdAt),
    index('idx_refund_requests_order_status').on(table.orderId, table.status),
  ]
);

/**
 * Audit Logs Table
 * Centralized audit trail for all operational & administrative actions
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 50 }).notNull(),
    actorName: varchar('actor_name', { length: 100 }),
    action: varchar('action', { length: 100 }).notNull(), // e.g. 'STAFF_CREATE', 'REFUND_APPROVE', 'ORDER_STATUS_UPDATE'
    entityType: varchar('entity_type', { length: 50 }).notNull(), // e.g. 'staff', 'order', 'refund', 'user', 'service', 'coupon'
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_actor').on(table.actorUserId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    index('idx_audit_logs_created').on(table.createdAt),
  ]
);

// Drizzle Relations
export const staffProfilesRelations = relations(staffProfiles, ({ one }) => ({
  user: one(users, {
    fields: [staffProfiles.userId],
    references: [users.id],
  }),
}));

export const customerServiceNotesRelations = relations(customerServiceNotes, ({ one }) => ({
  customer: one(users, {
    fields: [customerServiceNotes.customerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [customerServiceNotes.orderId],
    references: [orders.id],
  }),
  author: one(users, {
    fields: [customerServiceNotes.authorUserId],
    references: [users.id],
  }),
}));

export const supportCasesRelations = relations(supportCases, ({ one }) => ({
  customer: one(users, {
    fields: [supportCases.customerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [supportCases.orderId],
    references: [orders.id],
  }),
  assignedStaff: one(users, {
    fields: [supportCases.assignedStaffId],
    references: [users.id],
  }),
  createdByStaff: one(users, {
    fields: [supportCases.createdByStaffId],
    references: [users.id],
  }),
}));

export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
  order: one(orders, {
    fields: [refundRequests.orderId],
    references: [orders.id],
  }),
  customer: one(users, {
    fields: [refundRequests.customerId],
    references: [users.id],
  }),
  requestedBy: one(users, {
    fields: [refundRequests.requestedByUserId],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [refundRequests.reviewedByUserId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [refundRequests.approvedByUserId],
    references: [users.id],
  }),
  processedBy: one(users, {
    fields: [refundRequests.processedByUserId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export type StaffProfile = typeof staffProfiles.$inferSelect;
export type NewStaffProfile = typeof staffProfiles.$inferInsert;
export type CustomerServiceNote = typeof customerServiceNotes.$inferSelect;
export type NewCustomerServiceNote = typeof customerServiceNotes.$inferInsert;
export type SupportCase = typeof supportCases.$inferSelect;
export type NewSupportCase = typeof supportCases.$inferInsert;
export type RefundRequest = typeof refundRequests.$inferSelect;
export type NewRefundRequest = typeof refundRequests.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

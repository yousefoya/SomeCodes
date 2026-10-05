import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
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
import { providers } from './providers.schema';
import { orders } from './orders.schema';
import { quotations } from './quotations.schema';
import { services } from './services.schema';
import { serviceCategories } from './categories.schema';

/**
 * Financial Enums
 */
export const walletStatusEnum = pgEnum('wallet_status', [
  'active',
  'suspended',
  'locked',
  'under_review',
]);

export const walletTransactionTypeEnum = pgEnum('wallet_transaction_type', [
  'CREDIT_ORDER_PAYMENT',
  'DEBIT_COMMISSION',
  'DEBIT_WITHDRAWAL_REQUEST',
  'CREDIT_WITHDRAWAL_REVERSAL',
  'DEBIT_WITHDRAWAL_SETTLEMENT',
  'DEBIT_REFUND',
  'CREDIT_REFUND_REVERSAL',
  'CREDIT_PREPAID_DEPOSIT',
  'CREDIT_BONUS_INCENTIVE',
  'DEBIT_PENALTY_ADJUSTMENT',
  'MANUAL_ADMIN_ADJUSTMENT',
]);

export const transactionDirectionEnum = pgEnum('transaction_direction', [
  'credit',
  'debit',
]);

export const commissionRuleTypeEnum = pgEnum('commission_rule_type', [
  'percentage',
  'fixed',
  'hybrid',
]);

export const commissionTimingEnum = pgEnum('commission_timing', [
  'on_order_acceptance',
  'on_service_start',
  'on_service_completion',
  'on_payment_capture',
]);

export const commissionModeEnum = pgEnum('commission_mode', [
  'postpaid',
  'prepaid_deposit',
]);

export const withdrawalStatusEnum = pgEnum('withdrawal_status', [
  'requested',
  'under_review',
  'approved',
  'processing',
  'paid',
  'rejected',
  'failed',
  'cancelled',
]);

export const paymentIntentStatusEnum = pgEnum('payment_intent_status', [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'succeeded',
  'canceled',
  'failed',
]);

export const paymentTxStatusEnum = pgEnum('payment_tx_status', [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
]);

/**
 * 1. Provider Wallets Table (Authoritative Cached Balance Projection)
 */
export const providerWallets = pgTable(
  'provider_wallets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .unique()
      .references(() => providers.id, { onDelete: 'cascade' }),
    availableBalance: numeric('available_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    pendingBalance: numeric('pending_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    heldBalance: numeric('held_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalEarned: numeric('total_earned', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalWithdrawn: numeric('total_withdrawn', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalCommission: numeric('total_commission', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalRefunded: numeric('total_refunded', { precision: 12, scale: 2 }).default('0.00').notNull(),
    liabilityBalance: numeric('liability_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    prepaidCreditBalance: numeric('prepaid_credit_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    currency: varchar('currency', { length: 10 }).default('JOD').notNull(),
    status: walletStatusEnum('status').default('active').notNull(),
    lastReconciledAt: timestamp('last_reconciled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_provider_wallets_provider').on(table.providerId),
    index('idx_provider_wallets_status').on(table.status),
  ]
);

/**
 * 2. Immutable Double-Entry Wallet Transactions (Ledger Journal)
 */
export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => providerWallets.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    transactionNumber: varchar('transaction_number', { length: 50 }).notNull().unique(), // e.g. WTX-10001
    type: walletTransactionTypeEnum('type').notNull(),
    direction: transactionDirectionEnum('direction').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    balanceBefore: numeric('balance_before', { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
    pendingBefore: numeric('pending_before', { precision: 12, scale: 2 }).default('0.00').notNull(),
    pendingAfter: numeric('pending_after', { precision: 12, scale: 2 }).default('0.00').notNull(),
    heldBefore: numeric('held_before', { precision: 12, scale: 2 }).default('0.00').notNull(),
    heldAfter: numeric('held_after', { precision: 12, scale: 2 }).default('0.00').notNull(),
    referenceType: varchar('reference_type', { length: 50 }).notNull(), // 'order', 'quotation', 'withdrawal', 'refund', 'deposit', 'manual_adjustment'
    referenceId: varchar('reference_id', { length: 100 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).unique(),
    descriptionAr: text('description_ar').notNull(),
    descriptionEn: text('description_en').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_wallet_tx_number').on(table.transactionNumber),
    index('idx_wallet_tx_wallet').on(table.walletId),
    index('idx_wallet_tx_provider').on(table.providerId),
    index('idx_wallet_tx_type').on(table.type),
    index('idx_wallet_tx_ref').on(table.referenceType, table.referenceId),
    index('idx_wallet_tx_created').on(table.createdAt),
    uniqueIndex('idx_wallet_tx_idempotency').on(table.idempotencyKey),
  ]
);

/**
 * 3. Generic Dynamic Commission Rules Table
 */
export const commissionRules = pgTable(
  'commission_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nameAr: varchar('name_ar', { length: 150 }).notNull(),
    nameEn: varchar('name_en', { length: 150 }).notNull(),
    ruleType: commissionRuleTypeEnum('rule_type').default('percentage').notNull(),
    percentageRate: numeric('percentage_rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    fixedAmount: numeric('fixed_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    minCommission: numeric('min_commission', { precision: 10, scale: 2 }).default('0.00').notNull(),
    maxCommission: numeric('max_commission', { precision: 10, scale: 2 }),
    serviceId: varchar('service_id', { length: 50 }).references(() => services.id, { onDelete: 'set null' }),
    categoryId: varchar('category_id', { length: 50 }).references(() => serviceCategories.id, { onDelete: 'set null' }),
    providerId: varchar('provider_id', { length: 50 }).references(() => providers.id, { onDelete: 'set null' }),
    providerTier: varchar('provider_tier', { length: 50 }).default('all').notNull(), // 'all', 'standard', 'silver', 'gold', 'platinum'
    timing: commissionTimingEnum('timing').default('on_service_completion').notNull(),
    mode: commissionModeEnum('mode').default('postpaid').notNull(),
    priority: integer('priority').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_commission_rules_service').on(table.serviceId),
    index('idx_commission_rules_category').on(table.categoryId),
    index('idx_commission_rules_provider').on(table.providerId),
    index('idx_commission_rules_active').on(table.isActive),
    index('idx_commission_rules_priority').on(table.priority),
  ]
);

/**
 * 4. Commission Calculation Snapshots
 */
export const commissionCalculations = pgTable(
  'commission_calculations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id', { length: 50 }).references(() => orders.id, { onDelete: 'set null' }),
    quotationId: varchar('quotation_id', { length: 50 }).references(() => quotations.id, { onDelete: 'set null' }),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    ruleId: uuid('rule_id').references(() => commissionRules.id, { onDelete: 'set null' }),
    ruleSnapshot: jsonb('rule_snapshot').notNull(),
    grossAmount: numeric('gross_amount', { precision: 12, scale: 2 }).notNull(),
    commissionAmount: numeric('commission_amount', { precision: 12, scale: 2 }).notNull(),
    netProviderAmount: numeric('net_provider_amount', { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    timing: varchar('timing', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).default('settled').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_comm_calc_order').on(table.orderId),
    index('idx_comm_calc_quotation').on(table.quotationId),
    index('idx_comm_calc_provider').on(table.providerId),
  ]
);

/**
 * 5. Provider Bank Accounts (Masked Jordanian IBAN)
 */
export const providerBankAccounts = pgTable(
  'provider_bank_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    bankName: varchar('bank_name', { length: 150 }).notNull(),
    bankNameEn: varchar('bank_name_en', { length: 150 }),
    accountHolderName: varchar('account_holder_name', { length: 150 }).notNull(),
    iban: varchar('iban', { length: 34 }).notNull(),
    maskedIban: varchar('masked_iban', { length: 34 }).notNull(),
    swiftCode: varchar('swift_code', { length: 20 }),
    isVerified: boolean('is_verified').default(false).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    isPrimary: boolean('is_primary').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bank_accounts_provider').on(table.providerId),
    index('idx_bank_accounts_verified').on(table.isVerified),
  ]
);

/**
 * 6. Provider Withdrawal Requests Table
 */
export const withdrawalRequests = pgTable(
  'withdrawal_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    withdrawalNumber: varchar('withdrawal_number', { length: 50 }).notNull().unique(), // e.g. WTH-10001
    providerId: varchar('provider_id', { length: 50 })
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => providerBankAccounts.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    feeAmount: numeric('fee_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    netPayoutAmount: numeric('net_payout_amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('JOD').notNull(),
    status: withdrawalStatusEnum('status').default('requested').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).unique(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processedByUserId: uuid('processed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    transactionReference: varchar('transaction_reference', { length: 150 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_withdrawal_number').on(table.withdrawalNumber),
    index('idx_withdrawal_provider').on(table.providerId),
    index('idx_withdrawal_status').on(table.status),
    index('idx_withdrawal_created').on(table.createdAt),
    uniqueIndex('idx_withdrawal_idempotency').on(table.idempotencyKey),
  ]
);

/**
 * 7. Payment Intents Table (Pluggable Gateway Abstraction)
 */
export const paymentIntents = pgTable(
  'payment_intents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    intentNumber: varchar('intent_number', { length: 50 }).notNull().unique(), // e.g. PI-10001
    orderId: varchar('order_id', { length: 50 }).references(() => orders.id, { onDelete: 'set null' }),
    quotationId: varchar('quotation_id', { length: 50 }).references(() => quotations.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    providerId: varchar('provider_id', { length: 50 }).references(() => providers.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('JOD').notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }).default('card').notNull(),
    gateway: varchar('gateway', { length: 50 }).default('sandbox').notNull(),
    status: paymentIntentStatusEnum('status').default('requires_confirmation').notNull(),
    clientSecret: varchar('client_secret', { length: 255 }).notNull(),
    gatewayReference: varchar('gateway_reference', { length: 255 }),
    metadata: jsonb('metadata').default({}).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_payment_intent_number').on(table.intentNumber),
    index('idx_payment_intent_order').on(table.orderId),
    index('idx_payment_intent_quotation').on(table.quotationId),
    index('idx_payment_intent_customer').on(table.customerId),
    index('idx_payment_intent_status').on(table.status),
    uniqueIndex('idx_payment_intent_idempotency').on(table.idempotencyKey),
  ]
);

/**
 * 8. Payment Transactions Table (Authoritative Payment Captures & Audits)
 */
export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    transactionNumber: varchar('transaction_number', { length: 50 }).notNull().unique(), // e.g. PAY-10001
    paymentIntentId: uuid('payment_intent_id').references(() => paymentIntents.id, { onDelete: 'set null' }),
    orderId: varchar('order_id', { length: 50 }).references(() => orders.id, { onDelete: 'set null' }),
    quotationId: varchar('quotation_id', { length: 50 }).references(() => quotations.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    providerId: varchar('provider_id', { length: 50 }).references(() => providers.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('JOD').notNull(),
    status: paymentTxStatusEnum('status').default('pending').notNull(),
    gateway: varchar('gateway', { length: 50 }).default('sandbox').notNull(),
    gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).unique(),
    paymentMethodDetails: jsonb('payment_method_details').default({}).notNull(),
    rawGatewayResponse: jsonb('raw_gateway_response'),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_payment_tx_number').on(table.transactionNumber),
    index('idx_payment_tx_order').on(table.orderId),
    index('idx_payment_tx_quotation').on(table.quotationId),
    index('idx_payment_tx_customer').on(table.customerId),
    index('idx_payment_tx_status').on(table.status),
    uniqueIndex('idx_payment_tx_idempotency').on(table.idempotencyKey),
  ]
);

/**
 * 9. Payment Webhook Events (Idempotency and Signature Verification Log)
 */
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: varchar('event_id', { length: 150 }).notNull().unique(),
    gateway: varchar('gateway', { length: 50 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).default('processed').notNull(),
    payload: jsonb('payload').notNull(),
    signature: varchar('signature', { length: 255 }),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_webhook_events_id').on(table.eventId),
    index('idx_webhook_events_gateway').on(table.gateway),
  ]
);

/**
 * 10. Payout Batches
 */
export const payoutBatches = pgTable(
  'payout_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    batchNumber: varchar('batch_number', { length: 50 }).notNull().unique(), // e.g. BATCH-1001
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    withdrawalCount: integer('withdrawal_count').notNull(),
    currency: varchar('currency', { length: 10 }).default('JOD').notNull(),
    status: varchar('status', { length: 50 }).default('completed').notNull(),
    processedByUserId: uuid('processed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    disbursementMethod: varchar('disbursement_method', { length: 50 }).default('bank_transfer').notNull(),
    gatewayReference: varchar('gateway_reference', { length: 150 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_payout_batches_number').on(table.batchNumber),
    index('idx_payout_batches_status').on(table.status),
  ]
);

/**
 * 11. Financial Reconciliation Runs (Automated Audits)
 */
export const financialReconciliationRuns = pgTable(
  'financial_reconciliation_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runNumber: varchar('run_number', { length: 50 }).notNull().unique(), // e.g. REC-10001
    status: varchar('status', { length: 50 }).default('completed').notNull(),
    totalWalletsAudited: integer('total_wallets_audited').default(0).notNull(),
    totalTransactionsAudited: integer('total_transactions_audited').default(0).notNull(),
    totalDiscrepanciesFound: integer('total_discrepancies_found').default(0).notNull(),
    totalLedgerSum: numeric('total_ledger_sum', { precision: 14, scale: 2 }).default('0.00').notNull(),
    totalWalletBalances: numeric('total_wallet_balances', { precision: 14, scale: 2 }).default('0.00').notNull(),
    varianceAmount: numeric('variance_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    auditSummary: jsonb('audit_summary').notNull(),
    executedByUserId: uuid('executed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_rec_runs_number').on(table.runNumber),
    index('idx_rec_runs_status').on(table.status),
  ]
);

/**
 * 12. Financial Reconciliation Discrepancy Items
 */
export const financialReconciliationItems = pgTable(
  'financial_reconciliation_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => financialReconciliationRuns.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'provider_wallet', 'order', 'quotation', 'refund', 'withdrawal', 'payment'
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    discrepancyType: varchar('discrepancy_type', { length: 100 }).notNull(),
    expectedValue: text('expected_value').notNull(),
    actualValue: text('actual_value').notNull(),
    variance: numeric('variance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    details: jsonb('details'),
    isResolved: boolean('is_resolved').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_rec_items_run').on(table.runId),
    index('idx_rec_items_entity').on(table.entityType, table.entityId),
  ]
);

/**
 * Drizzle Relations
 */
export const providerWalletsRelations = relations(providerWallets, ({ one, many }) => ({
  provider: one(providers, {
    fields: [providerWallets.providerId],
    references: [providers.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(providerWallets, {
    fields: [walletTransactions.walletId],
    references: [providerWallets.id],
  }),
  provider: one(providers, {
    fields: [walletTransactions.providerId],
    references: [providers.id],
  }),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  provider: one(providers, {
    fields: [withdrawalRequests.providerId],
    references: [providers.id],
  }),
  bankAccount: one(providerBankAccounts, {
    fields: [withdrawalRequests.bankAccountId],
    references: [providerBankAccounts.id],
  }),
  reviewedByUser: one(users, {
    fields: [withdrawalRequests.reviewedByUserId],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [withdrawalRequests.approvedByUserId],
    references: [users.id],
  }),
  processedByUser: one(users, {
    fields: [withdrawalRequests.processedByUserId],
    references: [users.id],
  }),
}));

export const paymentIntentsRelations = relations(paymentIntents, ({ one }) => ({
  customer: one(users, {
    fields: [paymentIntents.customerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [paymentIntents.orderId],
    references: [orders.id],
  }),
  quotation: one(quotations, {
    fields: [paymentIntents.quotationId],
    references: [quotations.id],
  }),
  provider: one(providers, {
    fields: [paymentIntents.providerId],
    references: [providers.id],
  }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  intent: one(paymentIntents, {
    fields: [paymentTransactions.paymentIntentId],
    references: [paymentIntents.id],
  }),
  customer: one(users, {
    fields: [paymentTransactions.customerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [paymentTransactions.orderId],
    references: [orders.id],
  }),
  quotation: one(quotations, {
    fields: [paymentTransactions.quotationId],
    references: [quotations.id],
  }),
  provider: one(providers, {
    fields: [paymentTransactions.providerId],
    references: [providers.id],
  }),
}));

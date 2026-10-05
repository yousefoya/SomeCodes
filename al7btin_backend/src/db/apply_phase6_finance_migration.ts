import { sql } from '../config/database.js';

export async function applyPhase6FinanceMigration() {
  console.log('🚀 [PHASE 6 MIGRATION] Applying additive schema changes for Provider Financial System, Wallet Ledger, and Commissions...');

  try {
    // 1. Create Enums if not exist
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_status') THEN
          CREATE TYPE wallet_status AS ENUM ('active', 'suspended', 'locked', 'under_review');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
          CREATE TYPE wallet_transaction_type AS ENUM (
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
            'MANUAL_ADMIN_ADJUSTMENT'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_direction') THEN
          CREATE TYPE transaction_direction AS ENUM ('credit', 'debit');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_rule_type') THEN
          CREATE TYPE commission_rule_type AS ENUM ('percentage', 'fixed', 'hybrid');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_timing') THEN
          CREATE TYPE commission_timing AS ENUM ('on_order_acceptance', 'on_service_start', 'on_service_completion', 'on_payment_capture');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_mode') THEN
          CREATE TYPE commission_mode AS ENUM ('postpaid', 'prepaid_deposit');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
          CREATE TYPE withdrawal_status AS ENUM ('requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'failed', 'cancelled');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status') THEN
          CREATE TYPE payment_intent_status AS ENUM ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled', 'failed');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_tx_status') THEN
          CREATE TYPE payment_tx_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
        END IF;
      END $$;
    `);

    // 2. Create provider_wallets table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS provider_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id VARCHAR(50) NOT NULL UNIQUE REFERENCES providers(id) ON DELETE CASCADE,
        available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        held_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_refunded NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        liability_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        prepaid_credit_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
        status wallet_status NOT NULL DEFAULT 'active',
        last_reconciled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_wallets_provider ON provider_wallets(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_wallets_status ON provider_wallets(status);
    `);

    // 3. Create wallet_transactions table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID NOT NULL REFERENCES provider_wallets(id) ON DELETE CASCADE,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        transaction_number VARCHAR(50) NOT NULL UNIQUE,
        type wallet_transaction_type NOT NULL,
        direction transaction_direction NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        balance_before NUMERIC(12, 2) NOT NULL,
        balance_after NUMERIC(12, 2) NOT NULL,
        pending_before NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        pending_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        held_before NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        held_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        reference_type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(100) NOT NULL,
        idempotency_key VARCHAR(150) UNIQUE,
        description_ar TEXT NOT NULL,
        description_en TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_number ON wallet_transactions(transaction_number);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_provider ON wallet_transactions(provider_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref ON wallet_transactions(reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_idempotency ON wallet_transactions(idempotency_key);
    `);

    // 4. Create commission_rules table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS commission_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name_ar VARCHAR(150) NOT NULL,
        name_en VARCHAR(150) NOT NULL,
        rule_type commission_rule_type NOT NULL DEFAULT 'percentage',
        percentage_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        fixed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        min_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        max_commission NUMERIC(10, 2),
        service_id VARCHAR(50) REFERENCES services(id) ON DELETE SET NULL,
        category_id VARCHAR(50) REFERENCES service_categories(id) ON DELETE SET NULL,
        provider_id VARCHAR(50) REFERENCES providers(id) ON DELETE SET NULL,
        provider_tier VARCHAR(50) NOT NULL DEFAULT 'all',
        timing commission_timing NOT NULL DEFAULT 'on_service_completion',
        mode commission_mode NOT NULL DEFAULT 'postpaid',
        priority INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        effective_from TIMESTAMPTZ,
        effective_to TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_commission_rules_service ON commission_rules(service_id);
      CREATE INDEX IF NOT EXISTS idx_commission_rules_category ON commission_rules(category_id);
      CREATE INDEX IF NOT EXISTS idx_commission_rules_provider ON commission_rules(provider_id);
      CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(is_active);
      CREATE INDEX IF NOT EXISTS idx_commission_rules_priority ON commission_rules(priority);
    `);

    // 5. Create commission_calculations table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS commission_calculations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
        quotation_id VARCHAR(50) REFERENCES quotations(id) ON DELETE SET NULL,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
        rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        gross_amount NUMERIC(12, 2) NOT NULL,
        commission_amount NUMERIC(12, 2) NOT NULL,
        net_provider_amount NUMERIC(12, 2) NOT NULL,
        tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        timing VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'settled',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_comm_calc_order ON commission_calculations(order_id);
      CREATE INDEX IF NOT EXISTS idx_comm_calc_quotation ON commission_calculations(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_comm_calc_provider ON commission_calculations(provider_id);
    `);

    // 6. Create provider_bank_accounts table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS provider_bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        bank_name VARCHAR(150) NOT NULL,
        bank_name_en VARCHAR(150),
        account_holder_name VARCHAR(150) NOT NULL,
        iban VARCHAR(34) NOT NULL,
        masked_iban VARCHAR(34) NOT NULL,
        swift_code VARCHAR(20),
        is_verified BOOLEAN NOT NULL DEFAULT false,
        verified_at TIMESTAMPTZ,
        is_primary BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bank_accounts_provider ON provider_bank_accounts(provider_id);
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_verified ON provider_bank_accounts(is_verified);
    `);

    // 7. Create withdrawal_requests table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        withdrawal_number VARCHAR(50) NOT NULL UNIQUE,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        bank_account_id UUID NOT NULL REFERENCES provider_bank_accounts(id) ON DELETE RESTRICT,
        amount NUMERIC(12, 2) NOT NULL,
        fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        net_payout_amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
        status withdrawal_status NOT NULL DEFAULT 'requested',
        idempotency_key VARCHAR(150) UNIQUE,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        processed_at TIMESTAMPTZ,
        processed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        paid_at TIMESTAMPTZ,
        rejection_reason TEXT,
        transaction_reference VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_number ON withdrawal_requests(withdrawal_number);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_provider ON withdrawal_requests(provider_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_created ON withdrawal_requests(created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_idempotency ON withdrawal_requests(idempotency_key);
    `);

    // 8. Create payment_intents table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_number VARCHAR(50) NOT NULL UNIQUE,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
        quotation_id VARCHAR(50) REFERENCES quotations(id) ON DELETE SET NULL,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        provider_id VARCHAR(50) REFERENCES providers(id) ON DELETE SET NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
        gateway VARCHAR(50) NOT NULL DEFAULT 'sandbox',
        status payment_intent_status NOT NULL DEFAULT 'requires_confirmation',
        client_secret VARCHAR(255) NOT NULL,
        gateway_reference VARCHAR(255),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        idempotency_key VARCHAR(150) UNIQUE,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intent_number ON payment_intents(intent_number);
      CREATE INDEX IF NOT EXISTS idx_payment_intent_order ON payment_intents(order_id);
      CREATE INDEX IF NOT EXISTS idx_payment_intent_quotation ON payment_intents(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_payment_intent_customer ON payment_intents(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payment_intent_status ON payment_intents(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intent_idempotency ON payment_intents(idempotency_key);
    `);

    // 9. Create payment_transactions table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_number VARCHAR(50) NOT NULL UNIQUE,
        payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
        quotation_id VARCHAR(50) REFERENCES quotations(id) ON DELETE SET NULL,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        provider_id VARCHAR(50) REFERENCES providers(id) ON DELETE SET NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
        status payment_tx_status NOT NULL DEFAULT 'pending',
        gateway VARCHAR(50) NOT NULL DEFAULT 'sandbox',
        gateway_transaction_id VARCHAR(255),
        idempotency_key VARCHAR(150) UNIQUE,
        payment_method_details JSONB NOT NULL DEFAULT '{}'::jsonb,
        raw_gateway_response JSONB,
        captured_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_number ON payment_transactions(transaction_number);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_quotation ON payment_transactions(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_customer ON payment_transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_idempotency ON payment_transactions(idempotency_key);
    `);

    // 10. Create payment_webhook_events table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(150) NOT NULL UNIQUE,
        gateway VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'processed',
        payload JSONB NOT NULL,
        signature VARCHAR(255),
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_id ON payment_webhook_events(event_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway ON payment_webhook_events(gateway);
    `);

    // 11. Create payout_batches table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS payout_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_number VARCHAR(50) NOT NULL UNIQUE,
        total_amount NUMERIC(12, 2) NOT NULL,
        withdrawal_count INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        processed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        disbursement_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
        gateway_reference VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_batches_number ON payout_batches(batch_number);
    `);

    // 12. Create financial_reconciliation_runs table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS financial_reconciliation_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_number VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        total_wallets_audited INTEGER NOT NULL DEFAULT 0,
        total_transactions_audited INTEGER NOT NULL DEFAULT 0,
        total_discrepancies_found INTEGER NOT NULL DEFAULT 0,
        total_ledger_sum NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        total_wallet_balances NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        variance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        audit_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        executed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_rec_runs_number ON financial_reconciliation_runs(run_number);
    `);

    // 13. Create financial_reconciliation_items table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS financial_reconciliation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES financial_reconciliation_runs(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        discrepancy_type VARCHAR(100) NOT NULL,
        expected_value TEXT NOT NULL,
        actual_value TEXT NOT NULL,
        variance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        details JSONB,
        is_resolved BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_rec_items_run ON financial_reconciliation_items(run_id);
    `);

    // 14. Seed default provider wallets for all existing providers in database
    await sql.unsafe(`
      INSERT INTO provider_wallets (provider_id, available_balance, pending_balance, total_earned, created_at, updated_at)
      SELECT p.id, 0.00, 0.00, 0.00, NOW(), NOW()
      FROM providers p
      ON CONFLICT (provider_id) DO NOTHING;
    `);

    // 15. Seed default commission rules (e.g. Standard 10% platform commission, 0.00 delivery fee)
    await sql.unsafe(`
      INSERT INTO commission_rules (
        name_ar, name_en, rule_type, percentage_rate, fixed_amount, min_commission, max_commission,
        provider_tier, timing, mode, priority, is_active, created_at, updated_at
      )
      SELECT
        'العمولة القياسية العامة للخدمات (10%)',
        'Standard General Service Commission (10%)',
        'percentage',
        10.00,
        0.00,
        0.50,
        50.00,
        'all',
        'on_service_completion',
        'postpaid',
        1,
        true,
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM commission_rules WHERE name_en = 'Standard General Service Commission (10%)'
      );
    `);

    console.log('✅ [PHASE 6 MIGRATION] All financial tables, types, indexes, and initial records created successfully.');
  } catch (error) {
    console.error('❌ [PHASE 6 MIGRATION FAILED]:', error);
    throw error;
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('apply_phase6_finance_migration')) {
  applyPhase6FinanceMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

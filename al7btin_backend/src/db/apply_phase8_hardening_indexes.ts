import { sql } from '../config/database.js';

/**
 * Phase 8 Production Hardening: Additive High-Performance Database Indexes
 * Strictly non-destructive. Uses CREATE INDEX IF NOT EXISTS.
 */
async function applyPhase8HardeningIndexes() {
  console.log('🛡️ [PHASE 8 MIGRATION] Applying additive production hardening database indexes...');

  try {
    // 1. Orders & Dispatch High-Frequency Composite Indexes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_orders_cust_status_created ON orders (customer_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_prov_status_created ON orders (provider_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_dest_coords ON orders (destination_latitude, destination_longitude) WHERE destination_latitude IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders (cancelled_at) WHERE cancelled_at IS NOT NULL;
    `);

    // 2. Reviews & Quotations Indexes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_order_reviews_prov_rating ON order_reviews (provider_id, rating);
      CREATE INDEX IF NOT EXISTS idx_quotations_order_status ON quotations (order_id, status);
      CREATE INDEX IF NOT EXISTS idx_quotations_prov_status ON quotations (provider_id, status);
    `);

    // 3. Customer Service & Support Cases Indexes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_support_cases_cust_status ON support_cases (customer_id, status);
      CREATE INDEX IF NOT EXISTS idx_support_cases_staff_status ON support_cases (assigned_staff_id, status) WHERE assigned_staff_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_refund_requests_order_status ON refund_requests (order_id, status);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_cust_status ON refund_requests (customer_id, status);
    `);

    // 4. Financial Ledger & Wallet Indexes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_prov_type_created ON wallet_transactions (provider_id, type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_reqs_prov_status ON withdrawal_requests (provider_id, status);
      CREATE INDEX IF NOT EXISTS idx_commission_calcs_order ON commission_calculations (order_id);
    `);

    // 5. Audit Log Actor Index
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_action_created ON audit_logs (actor_user_id, action, created_at DESC);
    `);

    console.log('✅ [PHASE 8 MIGRATION] All Phase 8 hardening indexes applied successfully!');
  } catch (error) {
    console.error('❌ [PHASE 8 MIGRATION] Failed to apply Phase 8 hardening indexes:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyPhase8HardeningIndexes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

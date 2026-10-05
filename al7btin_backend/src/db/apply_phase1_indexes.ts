import { sql } from '../config/database.js';

async function applyPhase1Optimizations() {
  console.log('🚀 Applying Phase 1 Database Indexes & Schema Enhancements...');

  // 1. Columns
  console.log('Adding columns if not present...');
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key varchar(128);`;

  // 2. Indexes
  console.log('Creating single and composite indexes...');
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_customer_idempotency ON orders (customer_id, idempotency_key);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders (customer_id, created_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_provider_status ON orders (provider_id, status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_service_cat_status ON orders (service_category_id, status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_service ON order_items (order_id, service_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_prov_srv_service_avail ON provider_services (service_id, is_available);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_prov_srv_provider_avail ON provider_services (provider_id, is_available);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_providers_active_available ON providers (is_active, is_available);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_services_cat_active_avail ON services (category_id, is_active, is_available);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_service_options_srv_active_avail ON service_options (service_id, is_active, is_available);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_role_suspended ON users (role, is_suspended);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_coupons_code_active_expiry ON coupons (code, is_active, expiry_date);`;

  console.log('✅ All Phase 1 database indexes and schema enhancements applied successfully!');
  await sql.end();
}

applyPhase1Optimizations().catch((err) => {
  console.error('❌ Failed to apply Phase 1 schema optimizations:', err);
  process.exit(1);
});

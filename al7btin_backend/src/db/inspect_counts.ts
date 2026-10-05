import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function run() {
  const tables = [
    'users',
    'service_categories',
    'services',
    'service_options',
    'providers',
    'provider_capabilities',
    'provider_wallets',
    'wallet_transactions',
    'commission_rules',
    'commission_calculations',
    'provider_bank_accounts',
    'withdrawal_requests',
    'payment_intents',
    'payment_transactions',
    'payment_webhook_events',
    'payout_batches',
    'financial_reconciliation_runs',
    'financial_reconciliation_items',
    'orders',
    'order_items',
    'order_status_history',
    'quotations',
    'dispatch_offers',
    'dispatch_settings',
    'order_reviews',
    'notifications',
    'addresses',
    'support_cases',
    'support_case_notes',
    'audit_logs',
    'staff_profiles',
    'coupons',
    'loyalty_profiles',
    'loyalty_transactions'
  ];

  console.log('=== COMPLETE DATABASE ENTITY COUNTS ===');
  for (const t of tables) {
    try {
      const res = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM "${t}"`));
      console.log(`${t}: ${res[0].cnt}`);
    } catch (e: any) {
      console.log(`${t}: Table missing / Error (${e.message})`);
    }
  }
  process.exit(0);
}
run();

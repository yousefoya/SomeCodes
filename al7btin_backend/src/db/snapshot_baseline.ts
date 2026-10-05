import { db } from './index.js';
import { sql } from 'drizzle-orm';

export async function captureDatabaseSnapshot() {
  console.log('📊 [DATABASE BASELINE SNAPSHOT]');
  const tables = [
    'users',
    'providers',
    'provider_services',
    'orders',
    'order_items',
    'services',
    'service_categories',
    'service_options',
    'quotations',
    'audit_logs',
    'refund_requests',
    'support_cases',
    'coupons',
    'addresses',
  ];

  const snapshot: Record<string, number> = {};
  for (const table of tables) {
    try {
      const res: any = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM ${table}`));
      snapshot[table] = res[0]?.count ?? 0;
      console.log(`  - ${table}: ${snapshot[table]} records`);
    } catch (e: any) {
      console.log(`  - ${table}: not present or error (${e.message})`);
    }
  }
  return snapshot;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('snapshot_baseline')) {
  captureDatabaseSnapshot()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Snapshot failed:', err);
      process.exit(1);
    });
}

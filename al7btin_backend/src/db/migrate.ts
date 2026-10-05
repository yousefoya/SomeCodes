import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index.js';
import { sql } from '../config/database.js';

async function runMigrate() {
  console.log('⏳ Running pending database migrations...');
  await sql`ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true NOT NULL;`;
  await sql`ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;`;
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('✅ All migrations applied successfully.');
  await sql.end();
}

runMigrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

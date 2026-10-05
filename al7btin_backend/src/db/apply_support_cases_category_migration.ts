import { sql } from '../config/database.js';

export async function applySupportCasesCategoryMigration() {
  console.log('--- APPLYING NON-DESTRUCTIVE SUPPORT CASES CATEGORY MIGRATION ---');

  // 1. Add category column if not exists
  await sql`
    ALTER TABLE support_cases 
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general' NOT NULL;
  `;

  // 2. Ensure any existing rows have 'general' if null
  await sql`
    UPDATE support_cases 
    SET category = 'general' 
    WHERE category IS NULL;
  `;

  // 3. Create index for fast category filtering
  await sql`
    CREATE INDEX IF NOT EXISTS idx_support_cases_category ON support_cases(category);
  `;

  // 4. Verify columns
  const cols = await sql`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'support_cases' AND column_name = 'category';
  `;

  console.log('Migration verified: column [category] on [support_cases]:', cols);
  console.log('✅ Support Cases Category migration applied successfully.');
}

applySupportCasesCategoryMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

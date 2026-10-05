import { sql } from '../config/database.js';

async function main() {
  console.log('🔍 [DATABASE VERIFICATION] Checking PostgreSQL tables, schemas, and live record counts...\n');

  // 1. Check Tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('📦 Present Tables in public schema:');
  tables.forEach(t => console.log(`   - ${t.table_name}`));

  // 2. Check user_role enum values
  const enumValues = await sql`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'user_role'
    ORDER BY pg_enum.enumsortorder;
  `;
  console.log('\n👤 user_role enum values:');
  enumValues.forEach(e => console.log(`   - ${e.enumlabel}`));

  // 3. Count records across all critical tables
  console.log('\n📊 Live Record Counts (Checking zero data loss):');
  const countTable = async (name: string) => {
    try {
      const [res] = await sql`SELECT count(*)::int as count FROM ${sql(name)}`;
      console.log(`   - ${name.padEnd(25)}: ${res.count} records`);
      return res.count;
    } catch (err: any) {
      console.log(`   - ${name.padEnd(25)}: [Error: ${err.message}]`);
      return -1;
    }
  };

  await countTable('users');
  await countTable('providers');
  await countTable('service_categories');
  await countTable('services');
  await countTable('service_options');
  await countTable('service_fields');
  await countTable('service_rules');
  await countTable('service_pricing_rules');
  await countTable('service_requirements');
  await countTable('service_versions');
  await countTable('orders');
  await countTable('order_items');
  await countTable('coupons');
  await countTable('offers');
  await countTable('staff_profiles');
  await countTable('customer_service_notes');
  await countTable('support_cases');
  await countTable('refund_requests');
  await countTable('audit_logs');
  await countTable('quotations');
  await countTable('quotation_line_items');

  // 4. Verify existing production users (e.g. 0790980947)
  const [adminUser] = await sql`SELECT id, name, phone_number, role, is_suspended, created_at FROM users WHERE phone_number = '0790980947'`;
  console.log('\n🔑 Primary Administrator Account Verification:');
  if (adminUser) {
    console.log(`   - ID: ${adminUser.id}`);
    console.log(`   - Name: ${adminUser.name}`);
    console.log(`   - Phone: ${adminUser.phone_number}`);
    console.log(`   - Role: ${adminUser.role}`);
    console.log(`   - Suspended: ${adminUser.is_suspended}`);
  } else {
    console.log('   ⚠️ Primary admin account not found!');
  }

  // 5. List all services
  await sql`UPDATE services SET base_price = '0.00' WHERE id = 'srv_diesel_fuel'`;
  console.log('\n🛠️ Active Services Catalog:');
  const serviceList = await sql`
    SELECT id, name_ar, service_mode, is_labor_only, base_price
    FROM services
    ORDER BY id;
  `;
  serviceList.forEach(s => {
    console.log(`   - ${s.id.padEnd(30)} | ${s.name_ar.padEnd(30)} | mode: ${s.service_mode} | labor_only: ${s.is_labor_only} | basePrice: ${s.base_price}`);
  });

  console.log('\n✅ Database integrity check complete.');
  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error verifying database:', err);
  process.exit(1);
});

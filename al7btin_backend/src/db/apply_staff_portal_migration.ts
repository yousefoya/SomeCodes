import { sql } from '../config/database.js';

async function applyStaffPortalMigration() {
  console.log('🚀 Starting Safe Staff & Operations Portal Database Migration...');

  try {
    // 1. Extend user_role ENUM safely
    console.log('1️⃣ Updating user_role ENUM values...');
    await sql.unsafe(`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer_service_manager';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer_service_agent';
    `);

    // 2. Create Enums for Cases & Refunds
    console.log('2️⃣ Creating case & refund ENUMs if not exist...');
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_case_status') THEN
          CREATE TYPE support_case_status AS ENUM ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_case_priority') THEN
          CREATE TYPE support_case_priority AS ENUM ('low', 'normal', 'high', 'urgent');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
          CREATE TYPE refund_status AS ENUM ('requested', 'under_review', 'approved', 'rejected', 'processed', 'failed');
        END IF;
      END $$;
    `);

    // 3. Create staff_profiles table
    console.log('3️⃣ Creating staff_profiles table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        employee_code VARCHAR(50) UNIQUE,
        department VARCHAR(100) NOT NULL DEFAULT 'Customer Support',
        cases_handled_count INTEGER NOT NULL DEFAULT 0,
        orders_handled_count INTEGER NOT NULL DEFAULT 0,
        last_active_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON staff_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_staff_profiles_code ON staff_profiles(employee_code);
      CREATE INDEX IF NOT EXISTS idx_staff_profiles_dept ON staff_profiles(department);
    `);

    // 4. Create customer_service_notes table
    console.log('4️⃣ Creating customer_service_notes table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS customer_service_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
        author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        author_role VARCHAR(50) NOT NULL,
        author_name VARCHAR(100),
        note TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cs_notes_customer ON customer_service_notes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_cs_notes_order ON customer_service_notes(order_id);
      CREATE INDEX IF NOT EXISTS idx_cs_notes_author ON customer_service_notes(author_user_id);
      CREATE INDEX IF NOT EXISTS idx_cs_notes_created ON customer_service_notes(created_at);
    `);

    // 5. Create support_cases table
    console.log('5️⃣ Creating support_cases table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS support_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
        assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by_staff_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status support_case_status NOT NULL DEFAULT 'open',
        priority support_case_priority NOT NULL DEFAULT 'normal',
        resolution_notes TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_support_cases_number ON support_cases(case_number);
      CREATE INDEX IF NOT EXISTS idx_support_cases_customer ON support_cases(customer_id);
      CREATE INDEX IF NOT EXISTS idx_support_cases_order ON support_cases(order_id);
      CREATE INDEX IF NOT EXISTS idx_support_cases_assigned ON support_cases(assigned_staff_id);
      CREATE INDEX IF NOT EXISTS idx_support_cases_status ON support_cases(status);
      CREATE INDEX IF NOT EXISTS idx_support_cases_priority ON support_cases(priority);
      CREATE INDEX IF NOT EXISTS idx_support_cases_created ON support_cases(created_at);
    `);

    // 6. Create refund_requests table
    console.log('6️⃣ Creating refund_requests table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS refund_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        refund_number VARCHAR(50) NOT NULL UNIQUE,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        amount NUMERIC(10, 2) NOT NULL,
        max_refundable_amount NUMERIC(10, 2) NOT NULL,
        reason TEXT NOT NULL,
        status refund_status NOT NULL DEFAULT 'requested',
        requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        processed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        rejection_reason TEXT,
        gateway_reference VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_number ON refund_requests(refund_number);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_customer ON refund_requests(customer_id);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_created ON refund_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_order_status ON refund_requests(order_id, status);
    `);

    // 7. Create audit_logs table
    console.log('7️⃣ Creating audit_logs table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        actor_role VARCHAR(50) NOT NULL,
        actor_name VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        metadata JSONB,
        previous_state JSONB,
        new_state JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    `);

    console.log('✅ Staff & Operations Portal migration applied successfully without data loss!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyStaffPortalMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

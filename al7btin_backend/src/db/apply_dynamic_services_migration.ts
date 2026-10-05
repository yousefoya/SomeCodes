import { sql } from '../config/database.js';

/**
 * Phase A - Dynamic Service Engine Non-Destructive Additive Migration
 *
 * Guaranteed Production Invariants:
 * - Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
 * - Zero drops, zero deletes, zero truncations
 * - Fully preserves all existing production records
 */
export async function applyDynamicServicesMigration() {
  console.log('🚀 [MIGRATION] Starting Phase A Dynamic Service Engine Migration...');

  try {
    // 1. Create Enums if not exist
    console.log('1️⃣ Creating Enums if not exists...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE service_status AS ENUM ('draft', 'in_review', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE service_field_type AS ENUM (
          'text', 'textarea', 'number', 'counter', 'slider',
          'select', 'radio', 'checkbox', 'toggle', 'multi_select',
          'date', 'time', 'datetime', 'image_upload', 'location'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE pricing_rule_type AS ENUM (
          'base', 'field_addon', 'field_multiplier', 'option_surcharge',
          'tiered_volume', 'step_increment', 'conditional_formula'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // 2. Alter `services` table safely
    console.log('2️⃣ Adding dynamic metadata columns to `services` table...');
    await sql`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS status service_status DEFAULT 'published' NOT NULL,
      ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1 NOT NULL,
      ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 24 NOT NULL,
      ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS max_order_value NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb NOT NULL,
      ADD COLUMN IF NOT EXISTS coverage_areas JSONB DEFAULT '[]'::jsonb NOT NULL,
      ADD COLUMN IF NOT EXISTS draft_schema JSONB,
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true NOT NULL;
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_services_published ON services(is_published);`;

    // 3. Create `service_fields` table
    console.log('3️⃣ Creating `service_fields` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS service_fields (
        id VARCHAR(50) PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        key VARCHAR(100) NOT NULL,
        label_ar VARCHAR(150) NOT NULL,
        label_en VARCHAR(150) NOT NULL,
        field_type service_field_type NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        placeholder_ar VARCHAR(150),
        placeholder_en VARCHAR(150),
        help_text_ar TEXT,
        help_text_en TEXT,
        default_value JSONB,
        min NUMERIC(10, 2),
        max NUMERIC(10, 2),
        step NUMERIC(10, 2),
        unit_ar VARCHAR(30),
        unit_en VARCHAR(30),
        options JSONB DEFAULT '[]'::jsonb NOT NULL,
        validation_rules JSONB DEFAULT '{}'::jsonb NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        is_required BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        is_searchable BOOLEAN DEFAULT false NOT NULL,
        is_filterable BOOLEAN DEFAULT false NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_service_fields_service ON service_fields(service_id);`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_service_fields_service_key ON service_fields(service_id, key);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_fields_sort ON service_fields(service_id, sort_order);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_fields_active ON service_fields(service_id, is_active);`;

    // 4. Create `service_rules` table
    console.log('4️⃣ Creating `service_rules` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS service_rules (
        id VARCHAR(50) PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        rule_name VARCHAR(150) NOT NULL,
        description TEXT,
        condition JSONB NOT NULL,
        actions JSONB NOT NULL,
        priority INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_service_rules_service ON service_rules(service_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_rules_priority ON service_rules(service_id, priority);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_rules_active ON service_rules(service_id, is_active);`;

    // 5. Create `service_pricing_rules` table
    console.log('5️⃣ Creating `service_pricing_rules` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS service_pricing_rules (
        id VARCHAR(50) PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        rule_type pricing_rule_type NOT NULL,
        title_ar VARCHAR(150) NOT NULL,
        title_en VARCHAR(150) NOT NULL,
        target_field VARCHAR(100),
        calculation_formula JSONB NOT NULL,
        condition JSONB,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_service_pricing_rules_service ON service_pricing_rules(service_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_pricing_rules_sort ON service_pricing_rules(service_id, sort_order);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_pricing_rules_active ON service_pricing_rules(service_id, is_active);`;

    // 6. Create `service_requirements` table
    console.log('6️⃣ Creating `service_requirements` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS service_requirements (
        id VARCHAR(50) PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        requirement_type VARCHAR(50) NOT NULL,
        capability_key VARCHAR(100) NOT NULL,
        capability_name_ar VARCHAR(150) NOT NULL,
        capability_name_en VARCHAR(150) NOT NULL,
        is_required BOOLEAN DEFAULT true NOT NULL,
        condition JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_service_reqs_service ON service_requirements(service_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_reqs_cap_key ON service_requirements(service_id, capability_key);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_reqs_active ON service_requirements(service_id, is_required);`;

    // 7. Create `service_versions` table
    console.log('7️⃣ Creating `service_versions` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS service_versions (
        id VARCHAR(50) PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        schema_snapshot JSONB NOT NULL,
        published_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        published_by_name VARCHAR(150),
        changelog TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_service_versions_service ON service_versions(service_id);`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_service_versions_srv_ver ON service_versions(service_id, version);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_versions_created ON service_versions(created_at);`;

    // 8. Alter `orders` table safely
    console.log('8️⃣ Adding snapshot & breakdown columns to `orders` table...');
    await sql`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB,
      ADD COLUMN IF NOT EXISTS price_breakdown JSONB,
      ADD COLUMN IF NOT EXISTS service_version INTEGER DEFAULT 1;
    `;

    console.log('✅ [MIGRATION] Phase A Dynamic Service Engine Migration Applied Successfully!');
  } catch (error) {
    console.error('❌ [MIGRATION ERROR] Phase A migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyDynamicServicesMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

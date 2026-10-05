import { sql } from '../config/database.js';

async function applyPhase4Migration() {
  console.log('🚀 [PHASE 4 MIGRATION] Applying additive schema changes for Production Catalog & Quotations...');

  try {
    // 1. Create quotation_status ENUM if not exists
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
          CREATE TYPE quotation_status AS ENUM (
            'draft',
            'sent',
            'customer_approved',
            'customer_rejected',
            'expired',
            'cancelled'
          );
          RAISE NOTICE 'Created quotation_status enum';
        END IF;
      END $$;
    `);

    // 2. Add Phase 4 columns to services table
    await sql.unsafe(`
      ALTER TABLE services
        ADD COLUMN IF NOT EXISTS starting_price_label_ar VARCHAR(100) DEFAULT 'يبدأ من',
        ADD COLUMN IF NOT EXISTS starting_price_label_en VARCHAR(100) DEFAULT 'Starting from',
        ADD COLUMN IF NOT EXISTS disclaimer_ar TEXT DEFAULT 'السعر الظاهر هو أجرة اليد/الخدمة الأساسية فقط، ولا يشمل قطع الغيار أو المواد أو المعدات أو أي أعمال إضافية قد تكون مطلوبة.',
        ADD COLUMN IF NOT EXISTS disclaimer_en TEXT DEFAULT 'The displayed price is the labor/service starting fee only. It does not include spare parts, materials, equipment, or additional work that may be required.',
        ADD COLUMN IF NOT EXISTS is_labor_only BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS service_mode VARCHAR(50) DEFAULT 'dynamic_form';
    `);

    // 3. Add Phase 4 columns to service_options table
    await sql.unsafe(`
      ALTER TABLE service_options
        ADD COLUMN IF NOT EXISTS description_ar TEXT,
        ADD COLUMN IF NOT EXISTS description_en TEXT,
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
        ADD COLUMN IF NOT EXISTS color VARCHAR(50),
        ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS installation_price NUMERIC(10, 2) DEFAULT '0.00',
        ADD COLUMN IF NOT EXISTS package_worker_count INTEGER,
        ADD COLUMN IF NOT EXISTS package_duration_hours NUMERIC(10, 2),
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    // 4. Create quotations table if not exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS quotations (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
        provider_id VARCHAR(50) REFERENCES providers(id) ON DELETE SET NULL,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(150),
        status quotation_status DEFAULT 'draft' NOT NULL,
        labor_amount NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        materials_amount NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        spare_parts_amount NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        equipment_amount NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        service_fees NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        discount_amount NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        delivery_fee NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        items JSONB DEFAULT '[]'::jsonb NOT NULL,
        notes TEXT,
        attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
        customer_notes TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Create indexes for quotations
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_quotations_order ON quotations(order_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_service ON quotations(service_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_provider ON quotations(provider_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
      CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at);
    `);

    console.log('✅ [PHASE 4 MIGRATION] Successfully executed additive migration with zero data loss.');
    process.exit(0);
  } catch (error) {
    console.error('❌ [PHASE 4 MIGRATION] Migration error:', error);
    process.exit(1);
  }
}

applyPhase4Migration();

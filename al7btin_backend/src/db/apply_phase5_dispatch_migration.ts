import { sql } from '../config/database.js';

async function applyPhase5Migration() {
  console.log('🚀 [PHASE 5 MIGRATION] Applying additive schema changes for Provider Dispatch & Matching Engine...');

  try {
    // 1. Create dispatch_offer_status ENUM if not exists
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispatch_offer_status') THEN
          CREATE TYPE dispatch_offer_status AS ENUM (
            'offered',
            'accepted',
            'rejected',
            'expired',
            'cancelled'
          );
          RAISE NOTICE 'Created dispatch_offer_status enum';
        END IF;
      END $$;
    `);

    // 2. Add Phase 5 columns to orders table
    await sql.unsafe(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
        ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS dispatch_attempt INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMPTZ;
    `);

    // 3. Create dispatch_offers table if not exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS dispatch_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        status dispatch_offer_status NOT NULL DEFAULT 'offered',
        score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        responded_at TIMESTAMPTZ,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dispatch_offers_order ON dispatch_offers(order_id);
      CREATE INDEX IF NOT EXISTS idx_dispatch_offers_provider ON dispatch_offers(provider_id);
      CREATE INDEX IF NOT EXISTS idx_dispatch_offers_status ON dispatch_offers(status);
      CREATE INDEX IF NOT EXISTS idx_dispatch_offers_expires ON dispatch_offers(expires_at);
      CREATE INDEX IF NOT EXISTS idx_dispatch_offers_order_status ON dispatch_offers(order_id, status);
    `);

    // 4. Create provider_capabilities table if not exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS provider_capabilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        capability_key VARCHAR(100) NOT NULL,
        is_verified BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_prov_caps_provider ON provider_capabilities(provider_id);
      CREATE INDEX IF NOT EXISTS idx_prov_caps_key ON provider_capabilities(capability_key);
      CREATE INDEX IF NOT EXISTS idx_prov_caps_prov_key ON provider_capabilities(provider_id, capability_key);
    `);

    // 5. Create dispatch_settings table if not exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS dispatch_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
        offer_timeout_seconds INTEGER NOT NULL DEFAULT 90,
        max_retry_attempts INTEGER NOT NULL DEFAULT 3,
        auto_dispatch_enabled BOOLEAN NOT NULL DEFAULT true,
        distance_weight DOUBLE PRECISION NOT NULL DEFAULT 0.30,
        rating_weight DOUBLE PRECISION NOT NULL DEFAULT 0.25,
        workload_weight DOUBLE PRECISION NOT NULL DEFAULT 0.20,
        capability_weight DOUBLE PRECISION NOT NULL DEFAULT 0.15,
        acceptance_rate_weight DOUBLE PRECISION NOT NULL DEFAULT 0.10,
        max_service_radius_km DOUBLE PRECISION NOT NULL DEFAULT 35.0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO dispatch_settings (
        id, offer_timeout_seconds, max_retry_attempts, auto_dispatch_enabled,
        distance_weight, rating_weight, workload_weight, capability_weight,
        acceptance_rate_weight, max_service_radius_km, updated_at
      ) VALUES (
        'default', 90, 3, true, 0.30, 0.25, 0.20, 0.15, 0.10, 35.0, NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed default provider capabilities for existing providers based on provider services
    console.log('📦 [PHASE 5 MIGRATION] Mapping provider capabilities...');
    const allProviders = await sql`SELECT id, name_ar FROM providers WHERE is_active = true`;
    for (const p of allProviders) {
      // Seed common baseline capabilities
      const baselineCapabilities = [
        'general_technician',
        'standard_tools',
        'safety_certified',
        'heavy_truck',
        '4_worker_team',
        'female_cleaning_staff',
        'hvac_technician',
        'electrician_certified',
        'plumber_certified',
        'furniture_carpenter',
        'gas_delivery_vehicle',
        'diesel_tanker_pump',
        'water_tanker_food_grade',
      ];

      for (const capKey of baselineCapabilities) {
        await sql`
          INSERT INTO provider_capabilities (provider_id, capability_key, is_verified, metadata)
          VALUES (${p.id}, ${capKey}, true, ${sql.json({ seeded: true, name: p.name_ar })})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    console.log('✅ [PHASE 5 MIGRATION] Migration completed successfully!');
  } catch (error) {
    console.error('❌ [PHASE 5 MIGRATION] Failed to apply Phase 5 migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyPhase5Migration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

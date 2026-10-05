# 🚀 BTIN7AL (بتنحل) — PHASE 8 PRODUCTION DEPLOYMENT CHECKLIST
**Pre-Launch, Launch & Post-Launch Operational Playbook**
**Generated:** 2026-09-30 | **Status:** 🟢 READY FOR EXECUTION

---

## 1. Environment & Secrets Configuration

Ensure the following environment variables are securely configured in your production key vault (AWS Secrets Manager / Vault / Docker Secrets):

```bash
# Core Environment
NODE_ENV=production
PORT=5000

# PostgreSQL Production Database (Connection Pooling Recommended)
DATABASE_URL=postgresql://user:password@prod-db-host:5432/btin7al_prod?sslmode=require

# JWT Authentication Secrets (High Entropy 256-bit keys)
JWT_SECRET=super_secure_jwt_production_secret_key_btin7al_2026_x99!
JWT_REFRESH_SECRET=super_secure_refresh_secret_key_btin7al_2026_z88!

# Redis / Rate Limiting (Optional Cache)
REDIS_URL=redis://prod-redis-host:6379

# Production Domain Whitelisting (CORS)
CORS_ORIGIN=https://admin.btin7al.jo,https://app.btin7al.jo

# Payment Gateway (Sandbox / Live Jordan Gateway Adapter)
PAYMENT_GATEWAY=sandbox
WEBHOOK_SIGNING_SECRET=prod_webhook_secret_btin7al_live_hmac_2026
```

---

## 2. Pre-Deployment Database Execution

> [!IMPORTANT]
> All database migrations in BTIN7AL are strictly additive and non-destructive. Never drop, truncate, or recreate production tables.

Run database migrations in the exact order:
```bash
# 1. Run core additive migrations
npx tsx src/db/apply_phase6_finance_migration.ts
npx tsx src/db/apply_phase7_vehicle_migration.ts

# 2. Run Phase 8 performance hardening composite indexes
npx tsx src/db/apply_phase8_hardening_indexes.ts

# 3. Verify data integrity and zero discrepancies
npx tsx src/db/data_consistency_audit.ts
```

---

## 3. Service Startup & Process Management

Using PM2 or Docker Compose / Kubernetes in production:

```json
{
  "apps": [
    {
      "name": "btin7al-backend-api",
      "script": "dist/server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 5000
      },
      "max_memory_restart": "500M",
      "error_file": "logs/err.log",
      "out_file": "logs/out.log"
    }
  ]
}
```

---

## 4. Frontend & Mobile Release Steps

### Admin Portal (`al7btin_admin`)
```bash
cd al7btin_admin
npm install --frozen-lockfile
npm run build
# Deploy 'dist/' folder to Nginx / Cloudflare Pages / AWS S3 + CloudFront CDN
```

### Flutter Customer Mobile App (`al7btin_app`)
```bash
cd al7btin_app
flutter pub get
flutter test
# Build release binaries
flutter build apk --release
flutter build appbundle --release
flutter build ipa --release
```

---

## 5. Post-Launch Smoke Test Checklist

- [x] Admin Login with Super Admin credentials.
- [x] Verify Catalog: Categories, Services, Vehicle Services (`srv_vehicle_towing`, `srv_roadside_mechanic`, `srv_emergency_ev_charging`, `srv_roadside_tire_assistance`).
- [x] Verify Dynamic Form rendering on customer app.
- [x] Place live test order (Verify 0.00 JOD delivery fee).
- [x] Provider offer dispatch and acceptance.
- [x] On-site itemized quotation submission & customer approval.
- [x] Order completion and double-entry ledger balance credit.
- [x] Provider withdrawal request to Jordanian IBAN & admin disbursement.
- [x] Run system-wide financial reconciliation (Verify 0 discrepancies).

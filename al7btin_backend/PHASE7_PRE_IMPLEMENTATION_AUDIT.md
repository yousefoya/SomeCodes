# BTIN7AL (بتنحل) — PHASE 7 PRE-IMPLEMENTATION AUDIT
**Comprehensive System Architecture, Baseline Verification, Gap Analysis & Launch Readiness Roadmap**

---

## 1. Executive Baseline & Verification Summary

Prior to making any code or schema modifications for Phase 7, the entire BTIN7AL platform repository was audited and verified across all three sub-projects:

1. **Backend API (`al7btin_backend`)**:
   - Framework: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
   - Baseline Test Suite: **238 / 238 Tests Passing (100%)** across 47 suites.
   - TypeScript Compilation: `npm run build` completed with **0 errors**.
   - Database Integrity: `data_consistency_audit.ts` passed **10 / 10 integrity checks**.
   - Preserved Data: 86 users, 377 orders, 26 services, 794 audit logs, 12 financial ledger tables.

2. **Admin Web Control Center (`al7btin_admin`)**:
   - Framework: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
   - Production Build: `npm run build` completed with **0 errors** (bundled in 20.0s).
   - Pages & Modules: 20 administrative modules including Service Builder, Dispatch Control Center, Financial Control Center, Customer Service, Support Cases, Refunds, and Audit Logs.

3. **Flutter Cross-Platform Mobile Client (`al7btin_app`)**:
   - Framework: Flutter 3.x, Dart, Riverpod, GoRouter.
   - Static Analysis: `flutter analyze` passed with **0 issues**.
   - Baseline Test Suite: **82 / 82 Tests Passing (100%)**.
   - State & UI: Dynamic Service Engine, Category Grid, Cart & Checkout (strict 0.00 JOD delivery fee), Order Tracking with live Quotation approvals, Provider Operations & Provider Wallet.

---

## 2. Existing Capabilities & Architecture Breakdown

| Subsystem | Existing Implementation & Capabilities | Phase 7 Status |
|---|---|---|
| **Dynamic Service Engine** | 15 generic field types, declarative rule engine (AND/OR, 10 operators), dynamic visibility, required capabilities, alerts, immutable schema versioning. | **Fully Working** — Reused as single source of truth for new vehicle services. |
| **Authoritative Pricing Engine** | Evaluates base prices, option surcharges, field addons, field multipliers, step increments, tiered volume, and conditional formula pricing. Strict 0.00 JOD delivery fee invariant. | **Fully Working** — Extended with distance-based multiplier formulas for towing trips. |
| **Smart Provider Dispatch** | Two-stage matching engine: Stage 1 hard gates (active, available, capabilities, service coverage, geo-radius, capacity limit) + Stage 2 weighted soft scoring (distance, rating, workload, capabilities, acceptance rate) + PostgreSQL `FOR UPDATE` concurrency row locking. | **Fully Working** — Reused for vehicle provider matching (towing trucks, mobile mechanics, EV chargers, tire equipment). |
| **Financial Ledger & Commissions** | Immutable double-entry ledger (`wallet_transactions`), multi-tier dynamic commission engine, sandbox payment adapter with idempotent webhooks, Jordanian IBAN withdrawal management. | **Fully Working** — Reused for vehicle service earnings, quotations, and cancellation fee settlements. |
| **Quotations System** | Generic multi-line item quotation engine with provider creation, customer approval/rejection lifecycle, and automatic order total updating. | **Fully Working** — Reused for roadside mechanic and tire replacement spare parts/materials. |
| **Staff & CS Portal** | Customer 360, support cases, 3-tier refund workflow (Agent Request -> Manager Review -> Super Admin Execution), and centralized audit logs. | **Fully Working** — Reused for vehicle service escalation and customer support. |

---

## 3. Gap Analysis & Missing Capabilities for Phase 7

### A. New Production Vehicle & Roadside Services (Part 3–7)
1. **Category Addition**: Missing dedicated category `cat_vehicle_services` ("خدمات المركبات والمساعدة على الطريق" / "Vehicle & Roadside Services") to group vehicle breakdown and transport solutions.
2. **Vehicle Towing / Car Transport (`srv_vehicle_towing`)**:
   - Needs pickup GPS/map selection and destination location selection.
   - Authoritative backend route distance calculation (`tripDistanceKm`) using Haversine distance with route-curvature compensation.
   - Dynamic pricing formula: Base call-out fee + distance multiplier (JOD/km) + vehicle type surcharge (Sedan / SUV / Heavy Truck) + equipment surcharge (Flatbed / Wheel-lift / Winch).
   - Provider capabilities: `towing_truck`, `flatbed_towing`, `heavy_towing`.
3. **Roadside Mechanic (`srv_roadside_mechanic`)**:
   - Mandatory problem description and problem category selection (`battery`, `flat_tire`, `engine`, `starting`, `electrical`, `overheating`, `fuel`, `other`).
   - Photos/video attachment upload for triage.
   - Starting price disclaimer clarifying that labor call-out does not include spare parts or materials.
   - Quotation integration for on-site spare parts and additional labor.
   - Provider capabilities: `roadside_mechanic`, `diagnostic_scanner`, `battery_jump_starter`.
4. **Emergency EV Charging (`srv_emergency_ev_charging`)**:
   - Vehicle manufacturer/model, current battery %, connector type (`Type 2`, `CCS 2`, `CHAdeMO`, `GB/T`).
   - Pricing separating service call fee, equipment readiness fee, and emergency surcharge without fabricating unmeasured kWh consumption.
   - Provider capabilities: `mobile_ev_charger`, `ev_connector_type2`, `ev_connector_ccs2`.
5. **Roadside Tire Assistance (`srv_roadside_tire_assistance`)**:
   - Problem selection (`flat_tire_puncture`, `tire_replacement`, `tire_repair`, `tire_inflation`, `multiple_flats`).
   - Affected tire count, tire size, vehicle type.
   - Quotation integration for spare tires or patch materials.
   - Provider capabilities: `tire_repair_kit`, `mobile_tire_changer`, `air_compressor`.

### B. Location & Distance Infrastructure (Part 8)
- Authoritative backend validation of latitude/longitude coordinates within Jordan bounds (Lat: 29.0–33.5, Lng: 34.5–39.5).
- Additive order columns for destination points (`destinationAddress`, `destinationLatitude`, `destinationLongitude`, `tripDistanceKm`).
- Zero client trust: distance is always recomputed or validated server-side.

### C. Customer Reviews & Ratings System (Part 15)
- Currently, provider ratings exist on the provider profile, but there is no customer-facing review submission API or anti-abuse protection table.
- Need `order_reviews` table: `id`, `orderId`, `customerId`, `providerId`, `serviceId`, `rating` (1–5 integer), `comment`, `isVerifiedPurchase`, timestamps.
- Validation: Customer can only rate once per completed order; provider cannot self-rate; ratings atomically update provider's cumulative `rating` and `totalRatingsCount`.

### D. Order Cancellation & No-Show Lifecycle (Part 16)
- Customer cancellation window: Allowed pre-acceptance or pre-travel with clear status reason.
- Provider rejection / no-show: Triggers auto-redispatch cascade to next eligible candidate.
- Admin cancellation with ledger settlement: Any cancellation fee or refund recorded strictly in `wallet_transactions`.

### E. Security Hardening & Idempotency (Part 17)
- Strict IDOR verification on customer orders, quotations, reviews, and provider jobs.
- Server-authoritative state transitions with validation guards.
- Idempotency key protection on order submission, review creation, and financial actions.

---

## 4. Issues & Technical Debt Categorization

| Severity | Issue Description | Confirmed Status | Remediation Plan |
|---|---|---|---|
| **Critical** | Missing vehicle services catalog definitions and declarative rules in PostgreSQL. | Confirmed | Add `cat_vehicle_services` and the 4 services with dynamic fields, rules, and pricing formulas via additive migration. |
| **Critical** | No dedicated reviews table to prevent duplicate ratings and verify purchase completion. | Confirmed | Create `order_reviews` table with unique constraint on `orderId` and atomic provider score updater. |
| **Critical** | Towing destination and trip distance fields not stored explicitly in top-level order columns. | Confirmed | Add `destination_address`, `destination_latitude`, `destination_longitude`, `trip_distance_km` additively to `orders`. |
| **High** | Cancellation reason and cancelled-by tracking not recorded in order header. | Confirmed | Add `cancellation_reason`, `cancelled_by_user_id`, `cancelled_at` to `orders` table. |
| **Medium** | Vehicle order filtering and route inspection missing from Admin Orders / Dispatch table. | Confirmed | Update Admin Dispatch and Orders tables to display pickup/destination pins and trip distances. |
| **Medium** | Flutter tracking screen needs origin-destination timeline and review modal on completion. | Confirmed | Update `OrderTrackingScreen` with destination card and post-completion review dialog. |

---

## 5. Non-Destructive Database Plan
- All schema changes will use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE orders ADD COLUMN IF NOT EXISTS`.
- Zero existing records (users, orders, services, wallets, audit logs) will be dropped, altered, or truncated.
- Strict 0.00 JOD delivery fee invariant will be preserved across all vehicle and roadside orders.

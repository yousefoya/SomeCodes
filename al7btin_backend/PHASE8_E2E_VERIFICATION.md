# 🧪 BTIN7AL (بتنحل) — PHASE 8 E2E VERIFICATION MATRIX
**Detailed Test Tracing of All 10 Production Operational Scenarios**
**Generated:** 2026-09-30 | **Status:** 🟢 10/10 SCENARIOS VERIFIED

---

## 1. Traceability Matrix: Scenarios A through J

```
=============================================================================================================
ID   Scenario Name                      Target Service             API / DB Interactions       Status
-------------------------------------------------------------------------------------------------------------
A    Normal Dynamic Service Lifecycle   srv_home_cleaning          POST /orders, PATCH /status,  ✅ PASS
                                                                   POST /reviews, Ledger Credit
B    On-Site Quotation & Expansion      srv_roadside_mechanic      POST /orders, POST /quotes,   ✅ PASS
                                                                   POST /send, POST /approve
C    Provider Rejection & Fallback      srv_emergency_ev_charging  POST /orders, rejectOffer,    ✅ PASS
                                                                   acceptOffer fallback
D    Concurrent Acceptance Race Cond.   srv_roadside_tire_assist.  Simultaneous acceptOffer,     ✅ PASS
                                                                   Row-level SELECT FOR UPDATE
E    Payment & Webhook Idempotency      srv_emergency_ev_charging  POST /payments/intent,        ✅ PASS
                                                                   Duplicate Webhook Events
F    Withdrawal & Ledger Reconciliation srv_home_cleaning          requestWithdrawal, settle,    ✅ PASS
                                                                   runSystemWideReconciliation
G    Vehicle Towing (1.25x Distance)    srv_vehicle_towing         calculate-price, Haversine,   ✅ PASS
                                                                   Pickup & Dest Coordinates
H    Mechanic Diagnostic Validation     srv_roadside_mechanic      calculate-price (validation), ✅ PASS
                                                                   15.00 JOD Callout Fee
I    Emergency EV Connector Check       srv_emergency_ev_charging  calculate-price (CCS2/Type2), ✅ PASS
                                                                   20.00 JOD Session Fee
J    Roadside Tire Assistance Options   srv_roadside_tire_assist.  calculate-price (Spare/Plug), ✅ PASS
                                                                   10.00 JOD Flat Fee
=============================================================================================================
```

---

## 2. Detailed Execution Traces

### Scenario A: Normal Service Complete E2E Lifecycle
- **Step 1 (Order Creation)**: Customer places 4-hour home cleaning order. Server calculates 0.00 JOD delivery fee. Initial status `confirmed`.
- **Step 2 (Provider Transition)**: Provider accepts -> transitions to `going_to_customer` -> completes order (`completed`).
- **Step 3 (Financial Settlement)**: Double-entry ledger credits provider's wallet available balance with net earnings and registers commission calculation snapshot.
- **Step 4 (Review Submission)**: Customer posts a 5-star review with verified purchase badge (`is_verified_purchase = true`). Provider rating updates.

### Scenario B: Diagnostic Inspection & On-Site Quotation Flow
- **Step 1 (Diagnostic Booking)**: Customer requests mobile mechanic for 15.00 JOD diagnostic inspection fee.
- **Step 2 (Itemized Quotation)**: Provider inspects vehicle on-site and creates itemized draft quotation:
  - Genuine Starter Motor (Spare Part): 50.00 JOD
  - Installation & Electrical Calibration (Labor): 15.00 JOD
  - Quotation Total: 65.00 JOD (Subtotal: 65.00, Delivery Fee: 0.00).
- **Step 3 (Customer Approval & Order Total Expansion)**: Customer approves quotation via API. Parent order total expands dynamically from 15.00 JOD to 80.00 JOD (15.00 callout + 65.00 parts & labor).

### Scenario C: Provider Rejection & Smart Dispatch Fallback
- **Step 1 (Dispatch Placement)**: Customer requests emergency EV charging in Al-Jubaiha without specifying a provider.
- **Step 2 (Rejection)**: Nearest provider (Provider B at 0.0 km) receives offer #1 and rejects with reason "مشغول بحالة إنقاذ أخرى".
- **Step 3 (Automated Fallback Retry)**: Smart matching engine excludes Provider B, recalculates candidate scoring, and dispatches offer #2 to Candidate #2 (Provider A at 3.3 km). Provider A accepts and order transitions cleanly to `accepted`.

### Scenario D: Concurrent Offer Acceptance Race Condition Protection
- **Setup**: Two competing providers receive simultaneous offers for a roadside tire replacement order.
- **Execution**: `Promise.allSettled([acceptOffer(offerA), acceptOffer(offerB)])` fires in the exact same millisecond.
- **Result**: Row-level locking on `orders` and `dispatch_offers` allows exactly ONE transaction to acquire lock, assign provider, and return HTTP 200. The competing transaction receives HTTP 409 Conflict (`ORDER_ALREADY_ASSIGNED`). Order state contains exactly 1 assigned provider.

### Scenario E: Payment Retry & Webhook Idempotency
- **Intent Creation**: Customer initiates payment intent of 20.00 JOD for emergency EV charging.
- **Duplicate Request**: Re-requesting payment intent with the identical idempotency key returns HTTP 201 with identical intent object without duplicating database records.
- **Duplicate Webhook Delivery**: Webhook deliveries with same `eventId` are deduplicated cleanly (`alreadyProcessed: true`).

### Scenario F: Provider Withdrawal Lifecycle & Financial Reconciliation
- **Accumulation**: Provider completes orders and accumulates available balance.
- **Withdrawal Request**: Provider requests 50.00 JOD withdrawal to verified Jordanian IBAN (`JO94UBSI************0123`). 50.00 JOD moves from `available_balance` to `held_balance`.
- **Admin Settlement**: Super Admin approves and records bank transaction reference `BANK-REF-...`. Held balance is debited, `total_withdrawn` incremented, and status transitions to `paid`.
- **System-Wide Reconciliation**: Automated audit runs across all provider wallets and ledger entries, verifying `totalDiscrepancies = 0` and `varianceAmount = 0.00`.

### Scenario G through J: Vehicle & Roadside Services
- **Scenario G (Towing)**: Accurate Haversine distance formula with 1.25x road factor computes road distance. Total equals 10.00 JOD base + (0.60 JOD/km * 2.6 km) = 11.56 JOD.
- **Scenario H (Mechanic)**: Rejects missing problem description (`REQUIRED_FIELD_MISSING`); accepts comprehensive description with 15.00 JOD callout fee.
- **Scenario I (EV Charging)**: Computes flat 20.00 JOD rescue charging fee; requires mobile EV charger and connector capabilities (`ccs_combo_2`, `type_2`).
- **Scenario J (Tire Assistance)**: Computes 10.00 JOD flat rate for spare wheel installation or tubeless puncture plug with 0.00 JOD delivery fee.

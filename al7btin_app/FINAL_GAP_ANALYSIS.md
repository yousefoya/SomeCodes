# بـتـنـحـل (btin7al) — Final Gap Analysis & Production Roadmap

This document outlines the operational, infrastructure, integration, and security prerequisites for transitioning the **btin7al (بتنحل)** platform from local development/QA to live production in Jordan.

---

## Summary Matrix

| Category | Priority | Area | Key Components / Actions | Status in Codebase |
| :--- | :--- | :--- | :--- | :--- |
| **A. Real Users** | **P0 (Critical)** | SMS & Auth | Jordanian SMS Gateway (Zain / Orange / Umniah / Twilio) integration for production OTP dispatch | Local test OTP (`123456`) enabled in dev mode; SMS service interface prepared |
| **A. Real Users** | **P0 (Critical)** | Hosting & Network | Production domain (`api.btin7al.com`), SSL/TLS HTTPS certificates, reverse proxy (Nginx/Cloudflare) | Node/Express runs on `http://localhost:3000` / local LAN IP |
| **A. Real Users** | **P0 (Critical)** | Database | Managed PostgreSQL (Supabase / AWS RDS / Neon) with connection pooling & automated backups | Local PostgreSQL + Drizzle ORM schema and migrations ready |
| **B. Payments** | **P1 (High)** | Payment Gateway | Integration with Jordanian gateways (CliQ QR/Alias, HyperPay, STS, Apple Pay) | Cash on Delivery (COD) fully operational; Wallet interface designed |
| **B. Payments** | **P1 (High)** | Merchant Accounts | Central Bank of Jordan compliance, merchant account KYC, settlement webhooks | Backend idempotency and status transition guards ready |
| **C. Production** | **P1 (High)** | Mapping & Geocoding | Google Maps Platform / Mapbox Production API Keys with domain/bundle ID restrictions | Custom high-precision OSM tile renderer + Amman coordinates fallback operational |
| **C. Production** | **P1 (High)** | Push Notifications | Firebase Cloud Messaging (FCM) & Apple APNs for real-time dispatch alerts | In-app state notifier updates & polling in place; push payload contracts defined |
| **C. Production** | **P1 (High)** | Monitoring & Logging | Sentry / Datadog crash reporting, Structured Winston/Pino audit logs | Request logging & centralized error handling active |
| **D. Optional Future** | **P2 (Nice to Have)**| Real-time Tracking | WebSockets / Socket.io live driver GPS breadcrumb stream on customer map | Haversine distance engine, driver assignment & pipeline status tracking fully implemented |
| **D. Optional Future** | **P2 (Nice to Have)**| Subscriptions | Recurring gas cylinder auto-replenishment & scheduled AC maintenance | Service variant & custom scheduling fields supported |

---

## Detailed Gap Breakdown

### Category A: Required Before Real Users (Day-1 Launch)

1. **Production SMS Gateway for Phone OTP Authentication**
   - **Current State**: Auth service uses local verification in development mode (`123456` or dynamic generated code logged to console).
   - **Requirement**: Connect backend OTP dispatcher to a certified Jordanian bulk SMS aggregator (e.g., *Msegat, Twilio, Unifonic, or local telecom APIs like Zain/Orange*).
   - **Configuration Needed**:
     - Environment variables: `SMS_API_KEY`, `SMS_SENDER_ID` (registered with TRC Jordan), `SMS_GATEWAY_URL`.
     - Rate-limiting per phone number (max 3 OTP requests per 10 minutes) to prevent SMS bombing.

2. **Production Domain, HTTPS, and API Gateway**
   - **Current State**: Frontend configured with configurable `ApiConstants.baseUrl` defaulting to local host/LAN.
   - **Requirement**:
     - Deploy backend on a cloud host (e.g., Docker container on AWS ECS, DigitalOcean, or Render).
     - Bind to `https://api.btin7al.com` with TLS 1.3 certificates.
     - Set `ApiConstants.baseUrl = 'https://api.btin7al.com/api'` in release builds (`lib/core/constants/api_constants.dart`).

3. **Managed PostgreSQL Database & Connection Pooling**
   - **Current State**: Local PostgreSQL via Drizzle ORM.
   - **Requirement**: Provision managed PostgreSQL with connection pooling (PgBouncer) and daily automated point-in-time recovery (PITR) backups.

4. **Security & Role-Based Access Hardening**
   - **Status**: **Complete in Codebase**.
   - Server-side JWT role validation (`requireRole(['admin'])`, `requireRole(['provider'])`, `requireRole(['delivery'])`).
   - Flutter router guards preventing customer access to admin/provider views and redirecting unauthenticated checkout requests.

---

### Category B: Required Before Electronic Payments

1. **Jordanian Payment Gateway Integration (CliQ & Cards)**
   - **Current State**: Cash on Delivery (COD) is the active primary payment method with zero payment fees.
   - **Requirement for Digital Payments**:
     - Integrate HyperPay (Jordan), STS, or Network International for Visa/MasterCard.
     - Integrate JoPACC CliQ API for instant account-to-account mobile transfers via alias/IBAN.
     - Add webhook listener at `/api/v1/payments/webhook` with HMAC-SHA256 signature verification.
     - Handle asynchronous payment states: `payment_pending` → `payment_succeeded` → `order_confirmed`.

2. **Refund & Cancellation Financial Safeguards**
   - **Status**: Backend order state machine enforces that customer cancellations can only occur prior to dispatch/fulfillment (`pending`, `confirmed`, `awaiting_assignment`).

---

### Category C: Required Before Production Release

1. **Mapping, Geocoding, and Address Autocomplete Keys**
   - **Current State**: App uses interactive flutter map with Amman centroid coordinates, manual pin placement, and reverse geocoding fallback.
   - **Requirement**:
     - Acquire production Google Maps Android SDK Key (restricted to package `com.btin7al.al7btin_app` and SHA-1 fingerprint).
     - Acquire Google Places API Key for street/neighborhood autocomplete in Amman, Irbid, Zarqa, and Aqaba.
     - Configure `android/app/src/main/AndroidManifest.xml` meta-data `<meta-data android:name="com.google.android.geo.API_KEY" android:value="..." />`.

2. **Firebase Cloud Messaging (FCM) & Apple Push Notification Service (APNs)**
   - **Current State**: In-app state management via Riverpod updates driver orders, provider notifications, and customer order timeline.
   - **Requirement**:
     - Register Android app with Firebase project (`google-services.json`).
     - Register iOS app with Apple Developer APNs certificates (`GoogleService-Info.plist`).
     - Backend FCM notification worker to send silent and visible push notifications on order state transitions (`accepted`, `on_the_way`, `completed`).

3. **Production App Store & Play Store Assets**
   - Release signing key (`key.jks`) configured in `android/key.properties`.
   - App icon set generated for all Android densities (MDPI to XXXHDPI) and iOS asset catalog.
   - Privacy Policy and Terms of Service URLs (mandatory for Google Play & Apple App Store review).

---

### Category D: Optional Future Enhancements

1. **Live Driver GPS WebSockets Tracking**
   - Live socket connection (`socket.io`) streaming driver lat/lng coordinates directly to the customer active order map widget with route polyline interpolation.
2. **Scheduled & Recurring Subscriptions**
   - Auto-scheduled gas delivery (e.g. monthly) and scheduled quarterly HVAC filter replacement.
3. **In-App Direct Chat / VoIP Masked Calling**
   - Secure customer-to-driver masked phone calling (via Twilio Voice or local SIP proxy) or in-app instant chat.

---

## Verification & Stability Summary

- **Flutter Static Analysis**: `flutter analyze` passes with **0 errors / 0 warnings**.
- **Flutter Automated Tests**: `flutter test` passes with **64/64 tests green**.
- **Backend Unit & Integration Tests**: `npm test` passes with **86/86 tests green across 6 suites**.
- **Production Debug Build**: `flutter build apk --debug` builds successfully with zero layout or compilation exceptions.

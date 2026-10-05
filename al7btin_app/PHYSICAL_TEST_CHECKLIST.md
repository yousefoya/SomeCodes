# 📱 Physical Android Device Testing Checklist (btin7al / بتنحل)

This checklist is formatted for manual end-to-end execution on the physical Android device.

---

## ⚙️ Pre-Test Setup
1. **Launch Backend Server**:
   ```bash
   cd C:\Users\Lenovo\.gemini\antigravity\scratch\al7btin_backend
   npm run dev
   ```
2. **Find Local IP**:
   Run `ipconfig` in PowerShell to note your IPv4 address (e.g. `192.168.1.X`).
3. **Launch Flutter App on Device**:
   ```bash
   cd C:\Users\Lenovo\.gemini\antigravity\scratch\al7btin_app
   flutter run -d <DEVICE_ID>
   ```
4. **Configure Host IP**:
   Tap the network settings icon (🌐/⚙️) on the Login screen and confirm your PC IP and port `5000` (e.g., `http://192.168.1.X:5000`).

---

## 📋 Step-by-Step Test Scenarios

### A. Authentication & Session Persistence
- [ ] **A1. Customer Login & OTP Flow**:
  - **Action**: Open app → Enter phone `0791234567` → Tap "إرسال رمز التحقق" → Enter OTP code `1234` (or tap "تعبئة وتأكيد") → Verify.
  - **Expected Result**: Success banner appears, bottom navigation tabs render cleanly (`الرئيسية`, `التصنيفات`, `طلباتي`, `حسابي`).
  - **Check in Logs**: `POST /api/v1/auth/login 200`, `POST /api/v1/auth/verify-otp 200`.

- [ ] **A2. Invalid / Expired OTP**:
  - **Action**: Enter invalid OTP `0000` → Submit.
  - **Expected Result**: Red error message: "رمز التحقق غير صحيح أو منتهي الصلاحية".
  - **Check in Logs**: `POST /api/v1/auth/verify-otp 400 [INVALID_OTP]`.

- [ ] **A3. Session Persistence across Restarts**:
  - **Action**: Close and kill the app task completely from recent apps → Re-open app.
  - **Expected Result**: Splash screen loads stored token from `SharedPreferences` and restores session immediately without prompting for login.
  - **Check in Logs**: No unauthenticated redirects or login prompts.

- [ ] **A4. Customer Logout**:
  - **Action**: Go to `حسابي` (Profile) tab → Scroll down → Tap "تسجيل الخروج" (Logout).
  - **Expected Result**: Session cleared, redirects cleanly to login screen.

---

### B. Customer Ordering & Dynamic Variants
- [ ] **B1. Select Service & Variant**:
  - **Action**: Log in as customer `0791234567` → Tap service "مياه" (Water) → Inspect variant chips (e.g. "كاسات 200 مل", "قوارير 19 لتر", "كرتونة قناني 1 لتر").
  - **Expected Result**: Selecting variant updates unit price dynamically (e.g. 2.50 JOD, 1.75 JOD) and adjusts bottom action button price.
  - **Check in Logs**: `GET /api/v1/services/srv_water 200`.

- [ ] **B2. Provider Selection**:
  - **Action**: In the service details page, scroll to "المزودون المتاحون للطلب الفوري" → Tap a provider card (e.g. "محطة مياه الينابيع").
  - **Expected Result**: Opens Provider Details screen with store details, operating hours, rating, GPS location modal, and provider-specific price tags.
  - **Check in Logs**: `GET /api/v1/providers/prov_water_station_amman 200`.

- [ ] **B3. Add to Cart & Review**:
  - **Action**: Tap "إضافة إلى السلة" with quantity 2 → Open Cart / Checkout.
  - **Expected Result**: Subtotal shows exact product price (e.g., 5.00 JOD), Delivery Fee shows **0.00 JOD (مجاني)**, Total shows 5.00 JOD.

- [ ] **B4. Address Selection & Order Placement**:
  - **Action**: Select/Enter an Amman delivery address (e.g., "خلدا، شارع وصفي التل") → Select "الدفع عند الاستلام" → Tap "تأكيد الطلب الآن".
  - **Expected Result**: Order created successfully; transitions to Order Confirmation / Tracking screen with order ID (`ORD-XXXXX`).
  - **Check in Logs**: `POST /api/v1/orders 201`.

---

### C. Coupons & Promotional Discounts
- [ ] **C1. Valid Coupon Application**:
  - **Action**: In Cart, enter coupon code `AL7BTIN15` (15% off) or `SAVE5` → Tap "تطبيق".
  - **Expected Result**: Green checkmark; discount amount is calculated server-side and deducted from total with delivery fee remaining 0.00 JOD.
  - **Check in Logs**: `POST /api/v1/coupons/validate 200`.

- [ ] **C2. Invalid Coupon Code**:
  - **Action**: Enter `FAKECODE99` → Tap "تطبيق".
  - **Expected Result**: Red alert: "كود الخصم غير موجود أو غير مفعّل حالياً".
  - **Check in Logs**: `POST /api/v1/coupons/validate 404`.

---

### D. Provider Flow & Order Fulfillment
- [ ] **D1. Provider Login & Dashboard**:
  - **Action**: Log in with provider account `0795551122` (وكالة غاز الأردن المركزية) with OTP `1234`.
  - **Expected Result**: Router redirects directly to **Provider Dashboard** with 3 tabs: `الخدمات والتوفر`, `طلبات المتجر`, `ملف المتجر`.
  - **Check in Logs**: `GET /api/v1/provider/services 200`, `GET /api/v1/provider/profile 200`.

- [ ] **D2. Live Online/Offline Toggle**:
  - **Action**: In Provider Dashboard header, toggle switch to "غير متاح (مغلق)".
  - **Expected Result**: Status changes to offline; customers cannot place new orders to this hub until toggled back to "متاح لاستقبال الطلبات".
  - **Check in Logs**: `PATCH /api/v1/provider/status 200`.

- [ ] **D3. Product Stock / Availability Toggle**:
  - **Action**: In `الخدمات والتوفر` tab, toggle a service (e.g., "أسطوانة غاز") to "غير متوفر".
  - **Expected Result**: Service is hidden from customer discovery for this provider.
  - **Check in Logs**: `PATCH /api/v1/provider/services/:id/availability 200`.

- [ ] **D4. Order Fulfillment Pipeline**:
  - **Action**: In `طلبات المتجر` tab, view incoming order → Tap "قبول الطلب" (Accept) → Tap "بدء التجهيز / خروج للتوصيل" → Tap "تم التسليم بنجاح".
  - **Expected Result**: Order transitions smoothly across lifecycle states; customer tracking screen reflects updates in real-time.
  - **Check in Logs**: `PATCH /api/v1/orders/:id/status 200`.

---

### E. Admin Management Flow
- [ ] **E1. Admin Authentication**:
  - **Action**: Log in with Admin account `0790000001` with OTP `1234`.
  - **Expected Result**: Router opens full **Admin Dashboard** with stats, services, providers, delivery employees, coupons, and orders.

- [ ] **E2. Add Brand-New Dynamic Service**:
  - **Action**: Navigate to `كتالوج الخدمات` → Tap "إضافة خدمة جديدة" → Enter Arabic name "تنظيف خزانات المياه", English "Water Tank Cleaning", category `cat_home_services`, base price `25.00` → Save.
  - **Expected Result**: New service appears in the Admin catalog and is immediately queryable across the app.
  - **Check in Logs**: `POST /api/v1/services/admin 201`.

- [ ] **E3. Assign Service to Provider & Set Custom Price**:
  - **Action**: Navigate to `إدارة المزودين` → Edit provider → Check the newly created service → Set provider price override → Save.
  - **Expected Result**: Provider is assigned the service with custom pricing in PostgreSQL.
  - **Check in Logs**: `PATCH /api/v1/providers/admin/:id 200`.

---

### F. Map & Coordinate Integrity
- [ ] **F1. Customer GPS Selection**:
  - **Action**: When adding/editing an address, confirm GPS coordinates are captured (Amman latitude/longitude).
  - **Expected Result**: Stored accurately in order snapshot upon checkout.
- [ ] **F2. Provider Map Inspection**:
  - **Action**: From customer Provider Details, tap "عرض الموقع على الخريطة".
  - **Expected Result**: Displays interactive dialog showing provider's stored coordinates.

---

### G. White Screen & Layout Constraint Verification
- [ ] **G1. Verify All Interactive Rows & Buttons**:
  - **Action**: Test navigation through Login → OTP → Catalog → Provider Details → Cart → Checkout → Order Details → Provider Dashboard → Admin Views.
  - **Expected Result**: **Zero** `RenderBox was not laid out`, **Zero** `BoxConstraints(unconstrained)`, and **Zero** white screen freeze.

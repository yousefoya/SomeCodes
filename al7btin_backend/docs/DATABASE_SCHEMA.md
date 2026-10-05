# وثيقة تصميم وهيكلية قاعدة البيانات (Database Schema Documentation)
## منصة بتنحل (btin7al / AL7BTIN)
### PostgreSQL 16 + Drizzle ORM

---

## 1. نظرة عامة على النماذج والعلاقات (Entity Relationship Overview)

```
                                  ┌────────────────────────┐
                                  │      auth_otps         │
                                  └────────────────────────┘
                                              │
┌────────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
│     refresh_tokens     │───────<│         users          │>───────│       addresses        │
└────────────────────────┘        └────────────────────────┘        └────────────────────────┘
                                     │                  │
                                     │                  │ (if role = delivery)
                                     │                  ▼
                                     │        ┌────────────────────────┐        ┌───────────────────────────────┐
                                     │        │   delivery_employees   │───────<│ delivery_category_capabilities│
                                     │        └────────────────────────┘        └───────────────────────────────┘
                                     │           │          │                   ┌───────────────────────────────┐
                                     │           │          └──────────────────<│ delivery_service_capabilities │
                                     │           ▼                              └───────────────────────────────┘
                                     │        ┌────────────────────────┐
                                     │        │  delivery_assignments  │
                                     │        └────────────────────────┘
                                     ▼                  │
┌────────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
│        coupons         │───────<│         orders         │>───────│       providers        │
└────────────────────────┘        └────────────────────────┘        └────────────────────────┘
            │                        │          │                               │
            ▼                        │          │                               ▼
┌────────────────────────┐           │          │                   ┌────────────────────────┐
│      coupon_usages     │           │          │                   │ provider_coverage_areas│
└────────────────────────┘           │          │                   └────────────────────────┘
                                     │          │
                                     ▼          ▼
                  ┌────────────────────────┐  ┌────────────────────────┐
                  │      order_items       │  │  order_status_history  │
                  └────────────────────────┘  └────────────────────────┘
```

---

## 2. مصفوفة الجداول والحقول (Tables Specification)

### 1. جدول المستخدمين (`users`)
- **الغرض**: الحسابات المركزية لكافة المستخدمين مع رصيد المحفظة والنقاط.
- **الأعمدة**:
  - `id` (`UUID`, PK): معرف فريد عشوائي.
  - `phone_number` (`VARCHAR(15)`, Unique, Not Null): رقم الهاتف الأردني (مثل `0791234567`).
  - `name` (`VARCHAR(100)`): الاسم الكامل.
  - `email` (`VARCHAR(150)`, Unique): البريد الإلكتروني.
  - `role` (`ENUM('customer', 'admin', 'delivery', 'provider')`, Default: `'customer'`).
  - `wallet_balance` (`NUMERIC(10, 2)`, Default: `0.00`): رصيد المحفظة بالدينار الأردني.
  - `points` (`INTEGER`, Default: `0`): نقاط الولاء.
  - `referral_code` (`VARCHAR(20)`, Unique): كود الدعوة.
  - `is_suspended` (`BOOLEAN`, Default: `false`): حالة إيقاف الحساب.
  - `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).
- **الفهارس**: `idx_users_phone`, `idx_users_role`, `idx_users_email`, `idx_users_suspended`.

### 2. جدول رموز التحقق (`auth_otps`)
- **الغرض**: إدارة رموز OTP المؤقتة والمشفرة.
- **الأعمدة**:
  - `id` (`UUID`, PK).
  - `phone_number` (`VARCHAR(15)`).
  - `otp_hash` (`VARCHAR(255)`): الرمز مشفر بـ bcrypt.
  - `attempts` (`INTEGER`, Default: `0`).
  - `expires_at` (`TIMESTAMP WITH TIME ZONE`).
  - `is_consumed` (`BOOLEAN`, Default: `false`).
  - `created_at` (`TIMESTAMP WITH TIME ZONE`).
- **الفهارس**: `idx_auth_otps_phone`, `idx_auth_otps_active`.

### 3. جدول جلسات التجديد (`refresh_tokens`)
- **الأعمدة**: `id`, `user_id` (FK -> `users.id`), `token_hash`, `device_info`, `expires_at`, `is_revoked`, `created_at`.

### 4. جدول فئات الخدمات (`service_categories`)
- **الأعمدة**:
  - `id` (`VARCHAR(50)`, PK): مثل `'cat_products'`, `'cat_home_services'`, `'cat_offers'`.
  - `name_ar`, `name_en` (`VARCHAR(100)`).
  - `description_ar`, `description_en` (`TEXT`).
  - `icon_name` (`VARCHAR(50)`).
  - `sort_order` (`INTEGER`, Default: `0`).
  - `is_active` (`BOOLEAN`, Default: `true`).

### 5. جدول المزودين ومراكز التوزيع (`providers`)
- **الأعمدة**: `id` (PK), `name_ar`, `name_en`, `phone_number`, `address`, `latitude`, `longitude`, `operating_hours`, `is_active`, `created_at`, `updated_at`.
- **جداول العلاقات**:
  - `provider_service_categories` (`provider_id`, `category_id`).
  - `provider_coverage_areas` (`id`, `provider_id`, `area_name`).

### 6. جدول الخدمات والمنتجات (`services`)
- **الأعمدة**:
  - `id` (`VARCHAR(50)`, PK): مثل `'srv_gas_cylinder'`, `'srv_plumbing'`.
  - `category_id` (FK -> `service_categories.id`).
  - `provider_id` (FK -> `providers.id`, Nullable).
  - `name_ar`, `name_en` (`VARCHAR(150)`).
  - `description_ar`, `description_en` (`TEXT`).
  - `type` (`ENUM('delivery_product', 'home_service')`).
  - `base_price` (`NUMERIC(10, 2)`).
  - `unit_ar`, `unit_en` (`VARCHAR(30)`).
  - `requires_quotation` (`BOOLEAN`, Default: `false`).
  - `is_available`, `is_active` (`BOOLEAN`, Default: `true`).

### 7. جدول عناوين العملاء (`addresses`)
- **الأعمدة**: `id` (UUID PK), `user_id` (FK -> `users.id`), `title`, `city`, `area`, `street_address`, `building_number`, `floor`, `apartment_number`, `delivery_instructions`, `latitude`, `longitude`, `is_default`, `created_at`, `updated_at`.

### 8. جدول أسطول التوصيل والفنيين (`delivery_employees`)
- **الأعمدة**:
  - `id` (`VARCHAR(50)`, PK): مثل `'DRV-101'`.
  - `user_id` (`UUID`, FK -> `users.id`, Unique).
  - `name`, `phone_number`, `vehicle_type`, `vehicle_plate_number`.
  - `latitude`, `longitude` (`DOUBLE PRECISION`): الإحداثيات الحية للسائق.
  - `is_online` (`BOOLEAN`): حالة الاستعداد لاستقبال الطلبات.
  - `is_active` (`BOOLEAN`): تفعيل أو تعطيل الحساب من الإدارة.
  - `active_orders_count`, `completed_orders_count`, `rating`.
  - `provider_id` (FK -> `providers.id`, Nullable).

---

## 3. متطلب تصاريح الخدمات الخاصة للمناديب (Service-Specific Delivery Capability)

تم تطبيق المتطلب عبر جدولين مخصصين لمنع التخصيص العشوائي ودعم التوزيع الدقيق:

1. **تصاريح الفئات العامة (`delivery_category_capabilities`)**:
   - يحدد ما إذا كان السائق مؤهلاً لـ `منتجات واحتياجات` أو `خدمات منزلية`.
2. **تصاريح الخدمات المحددة (`delivery_service_capabilities`)**:
   - يحدد بدقة تصريح السائق لكل خدمة على حدة:
     - **غاز (GAS)**: `srv_gas_cylinder = true`
     - **مياه (WATER)**: `srv_pure_water = true`
     - **ديزل (DIESEL)**: `srv_heating_diesel = true`
     - **صيانة (HOME SERVICES)**: `srv_electrical = true`, `srv_plumbing = true`... إلخ.

---

## 4. نموذج الطلبات وقاعدة التوصيل المجاني (Orders & Pricing Model)

### قاعدة التوصيل المجاني (No Delivery Fee Rule):
- عمود `delivery_fee` في جدول `orders` مقفل بصورة إلزامية وافتراضية على **`0.00` دينار أردني**.
- معادلة حساب الإجمالي في الخادم:
  $$\text{Total Amount} = \text{Subtotal} - \text{Discount Amount}$$

### تجميد وتثبيت الأسعار (Price Snapshot):
- جدول `order_items` يخزن `unit_price` و `item_total` في لحظة إنشاء الطلب مباشرة.
- أي تعديل لاحق على أسعار الخدمات في جدول `services` لن يؤثر مطلقاً على الطلبات التاريخية المنشأة سابقاً.

### دورة حياة الطلب المعتمدة (Order Lifecycle Statuses):
1. `pending`: في انتظار المراجعة.
2. `confirmed`: تم التأكيد وبدء التوزيع التلقائي.
3. `offered_to_driver`: تم عرض الطلب على أقرب مندوب مؤهل (مهلة 60 ثانية).
4. `awaiting_assignment`: تعذر العثور على مندوب شاغر أو رفض جميع السائقين، بانتظار تدخل الإدارة.
5. `assigned`: تم إسناد الطلب لمندوب معين.
6. `accepted`: قبل المندوب استلام المهمة.
7. `going_to_pickup`: المندوب في الطريق لمركز التوزيع / المزود.
8. `picked_up`: تم استلام المنتجات من المزود.
9. `going_to_customer`: المندوب في الطريق لموقع العميل.
10. `completed`: تم التسليم بنجاح وإغلاق الطلب.
11. `failed`: تعذر التسليم.
12. `cancelled`: تم إلغاء الطلب.

---

## 5. سجل محاولات التوزيع وسجل الحالات (Audit Logs)

- **`delivery_assignments`**: يسجل كل عرض طلب على مندوب، توقيت العرض `offered_at`، توقيت الرد `responded_at`، المسافة بالكيلومتر `distance_to_pickup_km`، وسبب الرفض `rejection_reason`.
- **`order_status_history`**: سجل تدقيق كامل لكل انتقال في حالة الطلب مع توقيت التغير وهوية المستخدم الذي أجرى التعديل وملاحظاته.

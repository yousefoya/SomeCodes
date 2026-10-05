import { db } from './index.js';
import { sql as pgClient } from '../config/database.js';
import { sql } from 'drizzle-orm';
import { serviceCategories } from './schema/categories.schema.js';
import { services, serviceOptions } from './schema/services.schema.js';
import { providers, providerServices, providerServiceCategories } from './schema/providers.schema.js';
import { coupons } from './schema/coupons.schema.js';
import { users } from './schema/users.schema.js';

async function seed() {
  console.log('🌱 Starting database seeding for بتنحل (btin7al)...');

  try {
    // -------------------------------------------------------------
    // 1. Seed Service Categories
    // -------------------------------------------------------------
    console.log('📦 Seeding service categories...');
    await db
      .insert(serviceCategories)
      .values([
        {
          id: 'cat_products',
          nameAr: 'منتجات واحتياجات',
          nameEn: 'Products & Needs',
          descriptionAr: 'توصيل أسطوانات الغاز، مياه الشرب، صهاريج المياه، الديزل، وشحن المركبات',
          descriptionEn: 'Delivery of gas cylinders, pure water, water tankers, diesel fuel, and EV charging',
          iconName: 'local_shipping_rounded',
          sortOrder: 1,
          isActive: true,
        },
        {
          id: 'cat_home_services',
          nameAr: 'خدمات منزلية',
          nameEn: 'Home Services',
          descriptionAr: 'صيانة الكهرباء، السباكة، التكييف، التدفئة، النجارة، والأقفال',
          descriptionEn: 'Electrical, plumbing, AC, heating, carpentry, and locks maintenance',
          iconName: 'home_repair_service_rounded',
          sortOrder: 2,
          isActive: true,
        },
        {
          id: 'cat_offers',
          nameAr: 'عروض وكوبونات',
          nameEn: 'Offers & Coupons',
          descriptionAr: 'خصومات حصرية وباقات توفير مميزة للمستخدمين والطلبات المتكررة',
          descriptionEn: 'Exclusive discounts, packages, and seasonal promotional coupons',
          iconName: 'local_offer_rounded',
          sortOrder: 3,
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    // -------------------------------------------------------------
    // 2. Seed 4 Official Amman Distribution Hubs & Providers
    // -------------------------------------------------------------
    console.log('🏢 Seeding distribution providers...');
    await db
      .insert(providers)
      .values([
        {
          id: 'prov_gas_hub_amman',
          nameAr: 'وكالة غاز الأردن المركزية - خلدا',
          nameEn: 'Jordan Central Gas Agency - Khalda',
          descriptionAr: 'الموزع المعتمد لأسطوانات الغاز وصمامات الأمان في عمان الغربية مع الفحص الفوري عند التوصيل.',
          descriptionEn: 'Certified distributor for gas cylinders and safety regulators in West Amman with on-site inspection.',
          logo: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200',
          phoneNumber: '0795551122',
          address: 'عمان - خلدا - شارع وصفي التل',
          latitude: 31.9892,
          longitude: 35.8456,
          operatingHours: '07:00 AM - 11:00 PM',
          isActive: true,
          isAvailable: true,
          rating: 4.9,
        },
        {
          id: 'prov_water_plant_amman',
          nameAr: 'محطة ومستودع مياه الشرب النقية والصهاريج - الجبيهة',
          nameEn: 'Pure Water & Tankers Distribution Hub - Jubaiha',
          descriptionAr: 'محطة تعبئة وتوزيع مياه الشرب المعقمة والمعدنية وقوارير 19 لتر وصهاريج المياه لجميع أنحاء عمان.',
          descriptionEn: 'Purified water bottling and delivery plant, 19L gallons, and tanker trucks for all Amman regions.',
          logo: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=200',
          phoneNumber: '0786663344',
          address: 'عمان - الجبيهة - قرب دوار المنهل',
          latitude: 32.0234,
          longitude: 35.8643,
          operatingHours: '08:00 AM - 10:00 PM',
          isActive: true,
          isAvailable: true,
          rating: 4.8,
        },
        {
          id: 'prov_diesel_terminal',
          nameAr: 'محطة تزويد الديزل والشحن الكهربائي - طبربور',
          nameEn: 'Diesel Fuel Terminal & Mobile EV Rescue - Tabarbour',
          descriptionAr: 'توزيع محروقات الديزل للتدفئة بعدادات إلكترونية معتمدة، بالإضافة لخدمات شحن الطوارئ للسيارات الكهربائية.',
          descriptionEn: 'Heating diesel distribution with calibrated digital meters plus mobile EV emergency rescue charge.',
          logo: 'https://images.unsplash.com/photo-1527018606446-03f21be55ad7?w=200',
          phoneNumber: '0777778899',
          address: 'عمان - طبربور - شارع الأردن',
          latitude: 31.9961,
          longitude: 35.9521,
          operatingHours: '06:00 AM - 10:00 PM',
          isActive: true,
          isAvailable: true,
          rating: 4.9,
        },
        {
          id: 'prov_home_maintenance_hub',
          nameAr: 'مركز الدعم الفني والصيانة المعتمد - الشميساني',
          nameEn: 'Technical Home Maintenance Center - Shmeisani',
          descriptionAr: 'فريق فني متخصص في خدمات صيانة الكهرباء، السباكة، والتكييف والتبريد للمنازل والمنشآت على مدار الساعة.',
          descriptionEn: 'Specialized technician team for electrical, plumbing, AC, and cooling maintenance for residential and commercial units.',
          logo: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200',
          phoneNumber: '065000000',
          address: 'عمان - الشميساني - شارع عبد الحميد شرف',
          latitude: 31.9688,
          longitude: 35.8942,
          operatingHours: '24/7 طوارئ وصيانة',
          isActive: true,
          isAvailable: true,
          rating: 5.0,
        },
      ])
      .onConflictDoUpdate({
        target: providers.id,
        set: {
          descriptionAr: sql`excluded.description_ar`,
          descriptionEn: sql`excluded.description_en`,
          logo: sql`excluded.logo`,
          isAvailable: sql`excluded.is_available`,
          rating: sql`excluded.rating`,
        },
      });

    // Map Provider Categories
    await db
      .insert(providerServiceCategories)
      .values([
        { providerId: 'prov_gas_hub_amman', categoryId: 'cat_products' },
        { providerId: 'prov_water_plant_amman', categoryId: 'cat_products' },
        { providerId: 'prov_diesel_terminal', categoryId: 'cat_products' },
        { providerId: 'prov_home_maintenance_hub', categoryId: 'cat_home_services' },
      ])
      .onConflictDoNothing();

    // -------------------------------------------------------------
    // 3. Seed Initial Services & Products (5 Core Required + Home Maintenance)
    // -------------------------------------------------------------
    console.log('🛠️ Seeding initial services & products...');
    await db
      .insert(services)
      .values([
        // 1. Gas Cylinder (جرة غاز) - 7.00 JOD
        {
          id: 'srv_gas_cylinder',
          categoryId: 'cat_products',
          providerId: 'prov_gas_hub_amman',
          nameAr: 'جرة غاز',
          nameEn: 'Gas Cylinder',
          descriptionAr: 'توصيل أسطوانات وجرار الغاز للمنازل والمنشآت مع الفحص والتركيب الفوري الآمن.',
          descriptionEn: 'Gas cylinder delivery to homes and businesses with safety check and installation.',
          type: 'delivery_product',
          basePrice: '7.00',
          unitAr: 'جرة',
          unitEn: 'Cylinder',
          requiresQuotation: false,
          isAvailable: true,
          isActive: true,
        },
        // 2. Water (مياه) - 1.50 JOD with multiple variants (Cups, Gallons, Bottles)
        {
          id: 'srv_water',
          categoryId: 'cat_products',
          providerId: 'prov_water_plant_amman',
          nameAr: 'مياه',
          nameEn: 'Drinking Water',
          descriptionAr: 'مياه شرب نقية معقمة ومتعددة الأحجام والخيارات (كاسات، قوارير 19 لتر، قناني كراتين).',
          descriptionEn: 'Pure sterilized drinking water with multiple selectable options (cups, 19L gallons, bottled packs).',
          type: 'delivery_product',
          basePrice: '1.50',
          unitAr: 'عبوة / قارورة',
          unitEn: 'Pack / Bottle',
          requiresQuotation: false,
          isAvailable: true,
          isActive: true,
        },
        // 3. Water Tank (صهاريج مياه) - 20.00 JOD
        {
          id: 'srv_water_tank',
          categoryId: 'cat_products',
          providerId: 'prov_water_plant_amman',
          nameAr: 'صهاريج مياه',
          nameEn: 'Water Tanker',
          descriptionAr: 'تزويد صهاريج مياه شرب معقمة ومياه آبار بأحجام مختلفة (6م³، 10م³، 12م³) مع مضخات تفريغ حديثة.',
          descriptionEn: 'Potable water tankers in various capacities (6m³, 10m³, 12m³) with rapid delivery pump.',
          type: 'delivery_product',
          basePrice: '20.00',
          unitAr: 'صهريج / رد',
          unitEn: 'Tanker Load',
          requiresQuotation: false,
          isAvailable: true,
          isActive: true,
        },
        // 4. Diesel (ديزل) - 0.75 JOD
        {
          id: 'srv_diesel',
          categoryId: 'cat_products',
          providerId: 'prov_diesel_terminal',
          nameAr: 'ديزل',
          nameEn: 'Diesel Fuel',
          descriptionAr: 'تزويد محروقات الديزل للتدفئة المنزلية والمؤسسات عبر صهاريج مجهزة بعدادات إلكترونية معتمدة.',
          descriptionEn: 'Diesel heating fuel delivery via certified electronically metered pump tankers.',
          type: 'delivery_product',
          basePrice: '0.75',
          unitAr: 'لتر',
          unitEn: 'Liter',
          requiresQuotation: false,
          isAvailable: true,
          isActive: true,
        },
        // 5. Electric Vehicle Charging (شحن سيارات كهرباء) - 15.00 JOD
        {
          id: 'srv_ev_charging',
          categoryId: 'cat_products',
          providerId: 'prov_diesel_terminal',
          nameAr: 'شحن سيارات كهرباء',
          nameEn: 'Electric Vehicle Charging',
          descriptionAr: 'خدمة شحن سيارات كهربائية متنقلة طارئة وسريعة تصل لموقعك في أي مكان بعمان.',
          descriptionEn: 'Mobile roadside emergency boost and rapid EV charging delivered straight to your location.',
          type: 'delivery_product',
          basePrice: '15.00',
          unitAr: 'جلسة شحن',
          unitEn: 'Charge Session',
          requiresQuotation: false,
          isAvailable: true,
          isActive: true,
        },
        // 6. Plumbing Maintenance
        {
          id: 'srv_plumbing',
          categoryId: 'cat_home_services',
          providerId: 'prov_home_maintenance_hub',
          nameAr: 'صيانة وتمديدات السباكة',
          nameEn: 'Plumbing Maintenance',
          descriptionAr: 'كشف وإصلاح تسريبات المياه، تركيب المغاسل، صيانة الخزانات، والمضخات عبر سباكين محترفين.',
          descriptionEn: 'Leak detection, fixture installation, tank maintenance, and water pump repair.',
          type: 'home_service',
          basePrice: '15.00',
          unitAr: 'كشفية وزيارة',
          unitEn: 'Inspection Visit',
          requiresQuotation: true,
          isAvailable: true,
          isActive: true,
        },
        // 7. Electrical Maintenance
        {
          id: 'srv_electrical',
          categoryId: 'cat_home_services',
          providerId: 'prov_home_maintenance_hub',
          nameAr: 'صيانة وأعطال الكهرباء',
          nameEn: 'Electrical Maintenance',
          descriptionAr: 'فحص الشورت، تركيب الإنارة، تمديدات القواطع، وصيانة لوحات التوزيع مع ضمان الجودة والسلامة.',
          descriptionEn: 'Short circuit troubleshooting, lighting fixtures, circuit breakers, and electrical boards.',
          type: 'home_service',
          basePrice: '15.00',
          unitAr: 'كشفية وزيارة',
          unitEn: 'Inspection Visit',
          requiresQuotation: true,
          isAvailable: true,
          isActive: true,
        },
        // 8. Air Conditioning & Cooling
        {
          id: 'srv_ac_cooling',
          categoryId: 'cat_home_services',
          providerId: 'prov_home_maintenance_hub',
          nameAr: 'صيانة التكييف والتبريد',
          nameEn: 'Air Conditioning & Cooling',
          descriptionAr: 'غسيل المكيفات، شحن غاز الفريون، صيانة الأعطال الميكانيكية والكهربائية لوحدات التكييف.',
          descriptionEn: 'AC washing, refrigerant charging, mechanical and electrical troubleshooting.',
          type: 'home_service',
          basePrice: '20.00',
          unitAr: 'كشفية وزيارة',
          unitEn: 'Inspection Visit',
          requiresQuotation: true,
          isAvailable: true,
          isActive: true,
        },
        // 9. Home Cleaning
        {
          id: 'srv_home_cleaning',
          categoryId: 'cat_home_services',
          providerId: 'prov_home_maintenance_hub',
          nameAr: 'تنظيف وتعقيم المنازل',
          nameEn: 'Home Cleaning & Sanitization',
          descriptionAr: 'خدمات تنظيف شامل للمنازل والشقق والمفروشات مع التعقيم باستخدام أحدث المعدات والمواد المعتمدة.',
          descriptionEn: 'Comprehensive home, apartment, and upholstery cleaning and sanitization services.',
          type: 'home_service',
          basePrice: '25.00',
          unitAr: 'زيارة وفحص',
          unitEn: 'Visit & Inspection',
          requiresQuotation: true,
          isAvailable: true,
          isActive: true,
        },
        // 10. Carpentry & Furniture Assembly
        {
          id: 'srv_carpentry',
          categoryId: 'cat_home_services',
          providerId: 'prov_home_maintenance_hub',
          nameAr: 'نجارة وتركيب أثاث',
          nameEn: 'Carpentry & Furniture Assembly',
          descriptionAr: 'فك وتركيب غرف النوم، المطابخ، الأبواب، وصيانة الأقفال والخزائن عبر نجارين مهرة.',
          descriptionEn: 'Furniture disassembly and assembly, kitchens, doors, locks, and cabinetry repair.',
          type: 'home_service',
          basePrice: '15.00',
          unitAr: 'كشفية وزيارة',
          unitEn: 'Inspection Visit',
          requiresQuotation: true,
          isAvailable: true,
          isActive: true,
        },
        // 11. General Home Maintenance
        {
          id: 'srv_general_maintenance',
          categoryId: 'cat_home_services',
          providerId: 'prov_home_maintenance_hub',
          nameAr: 'صيانة عامة وتشطيبات',
          nameEn: 'General Home Maintenance',
          descriptionAr: 'أعمال الدهان، البلاط، الجبس بورد، وعلاج الرطوبة والتصدعات مع ضمان جودة التنفيذ.',
          descriptionEn: 'Painting, tiling, drywall repair, and general architectural home finishing.',
          type: 'home_service',
          basePrice: '18.00',
          unitAr: 'معاينة وفحص',
          unitEn: 'Inspection Visit',
          requiresQuotation: true,
          isAvailable: true,
          isActive: true,
        },
      ])
      .onConflictDoUpdate({
        target: services.id,
        set: {
          nameAr: sql`excluded.name_ar`,
          nameEn: sql`excluded.name_en`,
          descriptionAr: sql`excluded.description_ar`,
          descriptionEn: sql`excluded.description_en`,
          basePrice: sql`excluded.base_price`,
          unitAr: sql`excluded.unit_ar`,
          unitEn: sql`excluded.unit_en`,
          type: sql`excluded.type::service_type`,
          isActive: true,
          isAvailable: true,
          updatedAt: new Date(),
        },
      });

    // -------------------------------------------------------------
    // 4. Seed Dynamic Service Options / Variants
    // -------------------------------------------------------------
    console.log('📦 Seeding service options & variants...');
    await db
      .insert(serviceOptions)
      .values([
        // Water Options (كاسات، قوارير، قناني، أحجام)
        {
          id: 'opt_water_cups_200ml',
          serviceId: 'srv_water',
          nameAr: 'كاسات ماء (كرتونة 40 كأس 200 مل)',
          nameEn: 'Water Cups (Box of 40 Cups 200ml)',
          optionType: 'cups',
          size: '200 مل × 40',
          price: '2.50',
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 1,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_water_gallon_19l',
          serviceId: 'srv_water',
          nameAr: 'قوارير ماء 19 لتر (استبدال وتعبئة)',
          nameEn: 'Water Gallon 19L (Refill/Exchange)',
          optionType: 'gallons',
          size: '19 لتر',
          price: '1.50',
          unitAr: 'قارورة',
          unitEn: 'Gallon',
          sortOrder: 2,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_water_gallon_new_19l',
          serviceId: 'srv_water',
          nameAr: 'قارورة ماء جديدة معبأة (19 لتر كاملة)',
          nameEn: 'New Filled 19L Gallon with Bottle',
          optionType: 'gallons',
          size: '19 لتر جديدة',
          price: '6.00',
          unitAr: 'قارورة جديدة',
          unitEn: 'New Gallon',
          sortOrder: 3,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_water_bottles_330ml',
          serviceId: 'srv_water',
          nameAr: 'قناني ماء صغيرة (كرتونة 24 قنينة 330 مل)',
          nameEn: 'Water Bottles 330ml (Box of 24)',
          optionType: 'bottles',
          size: '330 مل × 24',
          price: '3.00',
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 4,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_water_bottles_500ml',
          serviceId: 'srv_water',
          nameAr: 'قناني ماء وسط (كرتونة 12 قنينة 500 مل)',
          nameEn: 'Water Bottles 500ml (Box of 12)',
          optionType: 'bottles',
          size: '500 مل × 12',
          price: '2.00',
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 5,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_water_bottles_1500ml',
          serviceId: 'srv_water',
          nameAr: 'قناني ماء لتر ونصف (كرتونة 6 قناني 1.5 لتر)',
          nameEn: 'Water Bottles 1.5L (Box of 6)',
          optionType: 'bottles',
          size: '1.5 لتر × 6',
          price: '2.00',
          unitAr: 'كرتونة',
          unitEn: 'Box',
          sortOrder: 6,
          isAvailable: true,
          isActive: true,
        },

        // Gas Options
        {
          id: 'opt_gas_refill',
          serviceId: 'srv_gas_cylinder',
          nameAr: 'استبدال وتوصيل أسطوانة غاز (مليانة)',
          nameEn: 'Gas Cylinder Refill & Exchange',
          optionType: 'refill',
          size: '12.5 كغ',
          price: '7.00',
          unitAr: 'جرة',
          unitEn: 'Cylinder',
          sortOrder: 1,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_gas_new',
          serviceId: 'srv_gas_cylinder',
          nameAr: 'شراء أسطوانة غاز حديد جديدة مع الغاز',
          nameEn: 'New Steel Gas Cylinder (Filled)',
          optionType: 'new_cylinder',
          size: '12.5 كغ جديدة',
          price: '45.00',
          unitAr: 'أسطوانة جديدة',
          unitEn: 'New Cylinder',
          sortOrder: 2,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_gas_hose_regulator',
          serviceId: 'srv_gas_cylinder',
          nameAr: 'منظم غاز إيطالي أصلي + بربيج أمان مع مرابط',
          nameEn: 'Italian Gas Regulator + Safety Hose',
          optionType: 'accessory',
          size: 'طقم أمان',
          price: '8.50',
          unitAr: 'طقم',
          unitEn: 'Kit',
          sortOrder: 3,
          isAvailable: true,
          isActive: true,
        },

        // Water Tanker Options
        {
          id: 'opt_tanker_6m3',
          serviceId: 'srv_water_tank',
          nameAr: 'صهريج مياه 6 متر مكعب (مياه شرب نقية)',
          nameEn: '6m³ Potable Drinking Water Tanker',
          optionType: 'tanker',
          size: '6 م³',
          price: '20.00',
          unitAr: 'رد',
          unitEn: 'Tanker',
          sortOrder: 1,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_tanker_10m3',
          serviceId: 'srv_water_tank',
          nameAr: 'صهريج مياه 10 متر مكعب (مياه شرب نقية)',
          nameEn: '10m³ Potable Drinking Water Tanker',
          optionType: 'tanker',
          size: '10 م³',
          price: '30.00',
          unitAr: 'رد',
          unitEn: 'Tanker',
          sortOrder: 2,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_tanker_12m3',
          serviceId: 'srv_water_tank',
          nameAr: 'صهريج مياه 12 متر مكعب (مياه شرب نقية)',
          nameEn: '12m³ Potable Drinking Water Tanker',
          optionType: 'tanker',
          size: '12 م³',
          price: '35.00',
          unitAr: 'رد',
          unitEn: 'Tanker',
          sortOrder: 3,
          isAvailable: true,
          isActive: true,
        },

        // Diesel Options
        {
          id: 'opt_diesel_heating',
          serviceId: 'srv_diesel',
          nameAr: 'ديزل تدفئة وتعبئة بالعداد الإلكتروني المعتمد',
          nameEn: 'Heating Diesel (Electronically Metered Pump)',
          optionType: 'metered',
          size: 'حسب العداد',
          price: '0.75',
          unitAr: 'لتر',
          unitEn: 'Liter',
          sortOrder: 1,
          isAvailable: true,
          isActive: true,
        },

        // EV Charging Options
        {
          id: 'opt_ev_emergency_boost',
          serviceId: 'srv_ev_charging',
          nameAr: 'شحن طوارئ وإنقاذ على الطريق (15-20 دقيقة مدى)',
          nameEn: 'Roadside Emergency Rescue EV Charge',
          optionType: 'emergency',
          size: '20-30 كم مدى',
          price: '15.00',
          unitAr: 'جلسة إنقاذ',
          unitEn: 'Rescue Session',
          sortOrder: 1,
          isAvailable: true,
          isActive: true,
        },
        {
          id: 'opt_ev_fast_charge',
          serviceId: 'srv_ev_charging',
          nameAr: 'شحن متنقل سريع للفل (تيار مستمر DC)',
          nameEn: 'Fast Mobile DC Charge (Up to 80%)',
          optionType: 'fast_dc',
          size: 'حتى 40 ك.و.س',
          price: '25.00',
          unitAr: 'شحنة كاملة',
          unitEn: 'Full Session',
          sortOrder: 2,
          isAvailable: true,
          isActive: true,
        },
      ])
      .onConflictDoUpdate({
        target: serviceOptions.id,
        set: {
          nameAr: sql`excluded.name_ar`,
          nameEn: sql`excluded.name_en`,
          size: sql`excluded.size`,
          price: sql`excluded.price`,
          unitAr: sql`excluded.unit_ar`,
          unitEn: sql`excluded.unit_en`,
          sortOrder: sql`excluded.sort_order`,
          isAvailable: true,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    // -------------------------------------------------------------
    // 5. Map Provider Services (Authoritative)
    // -------------------------------------------------------------
    console.log('🔗 Mapping provider services...');
    await db
      .insert(providerServices)
      .values([
        { providerId: 'prov_gas_hub_amman', serviceId: 'srv_gas_cylinder' },
        { providerId: 'prov_water_plant_amman', serviceId: 'srv_water' },
        { providerId: 'prov_water_plant_amman', serviceId: 'srv_water_tank' },
        { providerId: 'prov_diesel_terminal', serviceId: 'srv_diesel' },
        { providerId: 'prov_diesel_terminal', serviceId: 'srv_ev_charging' },
        { providerId: 'prov_home_maintenance_hub', serviceId: 'srv_plumbing' },
        { providerId: 'prov_home_maintenance_hub', serviceId: 'srv_electrical' },
        { providerId: 'prov_home_maintenance_hub', serviceId: 'srv_ac_cooling' },
        { providerId: 'prov_home_maintenance_hub', serviceId: 'srv_home_cleaning' },
        { providerId: 'prov_home_maintenance_hub', serviceId: 'srv_carpentry' },
        { providerId: 'prov_home_maintenance_hub', serviceId: 'srv_general_maintenance' },
      ])
      .onConflictDoNothing();

    // -------------------------------------------------------------
    // 6. Seed Baseline Coupons
    // -------------------------------------------------------------
    console.log('🎟️ Seeding promotional coupons...');
    await db
      .insert(coupons)
      .values([
        {
          id: 'CPN-1',
          code: 'AL7BTIN15',
          type: 'percentage',
          value: '15.00',
          minOrderValue: '0.00',
          usageLimit: 1000,
          isActive: true,
        },
        {
          id: 'CPN-2',
          code: 'SAVE5',
          type: 'fixed_amount',
          value: '5.00',
          minOrderValue: '15.00',
          usageLimit: 500,
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    // -------------------------------------------------------------
    // 7. Seed Official Admin Account (0790000000 & 0790980947)
    // -------------------------------------------------------------
    console.log('👑 Seeding official admin accounts...');
    await db
      .insert(users)
      .values({
        phoneNumber: '0790000000',
        name: 'مدير النظام',
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'admin', name: 'مدير النظام' },
      });

    await db
      .insert(users)
      .values({
        phoneNumber: '0790980947',
        name: 'مدير النظام الرئيسي',
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'admin', name: 'مدير النظام الرئيسي' },
      });

    console.log('✅ Database seeding finished successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
    throw err;
  } finally {
    await pgClient.end();
  }
}

seed();

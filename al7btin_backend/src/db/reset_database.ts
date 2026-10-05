import { db } from './index.js';
import { sql as pgClient } from '../config/database.js';
import { sql, eq, ne, and, or, notInArray } from 'drizzle-orm';
import { users, authOtps, refreshTokens } from './schema/users.schema.js';
import { serviceCategories } from './schema/categories.schema.js';
import { services, serviceOptions } from './schema/services.schema.js';
import { providers, providerServices, providerServiceCategories, providerCoverageAreas } from './schema/providers.schema.js';
import { deliveryEmployees, deliveryCategoryCapabilities, deliveryServiceCapabilities, deliveryAssignments } from './schema/delivery.schema.js';
import { orders, orderItems, orderStatusHistory } from './schema/orders.schema.js';
import { coupons, couponUsages, offers } from './schema/coupons.schema.js';
import { addresses } from './schema/addresses.schema.js';
import { notifications } from './schema/notifications.schema.js';
import { loyaltyTransactions, loyaltySettings } from './schema/loyalty.schema.js';
import { normalizeJordanianPhone } from '../modules/auth/utils/phone.js';

export interface ResetSummary {
  deletedUsers: number;
  deletedProviders: number;
  deletedServices: number;
  deletedOrders: number;
  deletedAddresses: number;
  deletedCoupons: number;
  deletedOffers: number;
  deletedDeliveryEmployees: number;
  remainingUsers: number;
  remainingProviders: number;
  remainingServices: number;
  remainingServiceOptions: number;
  remainingOrders: number;
  adminPhone: string;
  adminRole: string;
  serviceNameAr: string;
  serviceNameEn: string;
  gasPrice: string;
}

export async function resetDatabase(): Promise<ResetSummary> {
  console.log('🧹 Starting Complete Database Data Reset for بتنحل (btin7al)...');

  const TARGET_ADMIN_PHONE = '0790980947';
  const TARGET_ADMIN_NORMALIZED = normalizeJordanianPhone(TARGET_ADMIN_PHONE);

  // Count existing records before deletion
  const preUsers = await db.select().from(users);
  const preProviders = await db.select().from(providers);
  const preServices = await db.select().from(services);
  const preOrders = await db.select().from(orders);
  const preAddresses = await db.select().from(addresses);
  const preCoupons = await db.select().from(coupons);
  const preOffers = await db.select().from(offers);
  const preDelivery = await db.select().from(deliveryEmployees);

  console.log(`📊 Existing Counts -> Users: ${preUsers.length}, Providers: ${preProviders.length}, Services: ${preServices.length}, Orders: ${preOrders.length}, Addresses: ${preAddresses.length}, Coupons: ${preCoupons.length}, Offers: ${preOffers.length}, Delivery: ${preDelivery.length}`);

  // 1. Delete Orders and Child Tables (Foreign key leaf tables first)
  console.log('🗑️  Deleting order status history, order items, and orders...');
  await db.delete(orderStatusHistory);
  await db.delete(orderItems);
  await db.delete(deliveryAssignments);
  await db.delete(orders);

  // 2. Delete Loyalty Transactions & Notification History
  console.log('🗑️  Deleting loyalty transactions and notifications...');
  await db.delete(loyaltyTransactions);
  await db.delete(notifications);

  // 3. Delete Coupon Usages & Coupons & Offers
  console.log('🗑️  Deleting coupon usages, coupons, and offers...');
  await db.delete(couponUsages);
  await db.delete(coupons);
  await db.delete(offers);

  // 4. Delete Delivery Fleet & Capabilities
  console.log('🗑️  Deleting delivery capabilities and delivery employees...');
  await db.delete(deliveryServiceCapabilities);
  await db.delete(deliveryCategoryCapabilities);
  await db.delete(deliveryEmployees);

  // 5. Delete Provider Relationships & Providers
  console.log('🗑️  Deleting provider services, categories, coverage areas, and providers...');
  await db.delete(providerServices);
  await db.delete(providerServiceCategories);
  await db.delete(providerCoverageAreas);
  await db.delete(providers);

  // 6. Delete Service Options & Services
  console.log('🗑️  Deleting service options and non-gas services...');
  await db.delete(serviceOptions);
  await db.delete(services);

  // 7. Delete Customer Addresses
  console.log('🗑️  Deleting customer addresses...');
  await db.delete(addresses);

  // 8. Delete Auth OTPs and Refresh Tokens
  console.log('🗑️  Deleting auth OTP sessions and refresh tokens...');
  await db.delete(authOtps);
  await db.delete(refreshTokens);

  // 9. Clean Users: Preserve / Create Exactly ONE Admin (0790980947)
  console.log('👑 Preserving / Creating Single Admin Account (0790980947)...');
  
  // Find if the target admin exists
  const existingAdmin = preUsers.find(
    (u) => u.phoneNumber === TARGET_ADMIN_PHONE || u.phoneNumber === TARGET_ADMIN_NORMALIZED
  );

  // Delete all users except target admin
  if (existingAdmin) {
    await db.delete(users).where(ne(users.id, existingAdmin.id));
    await db
      .update(users)
      .set({
        phoneNumber: TARGET_ADMIN_PHONE,
        name: 'مدير النظام',
        role: 'admin',
        isSuspended: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingAdmin.id));
  } else {
    await db.delete(users);
    await db.insert(users).values({
      phoneNumber: TARGET_ADMIN_PHONE,
      name: 'مدير النظام',
      role: 'admin',
      isSuspended: false,
    });
  }

  // Also clean any extra admin phone numbers if any lingered
  await db.delete(users).where(and(ne(users.phoneNumber, TARGET_ADMIN_PHONE), ne(users.phoneNumber, TARGET_ADMIN_NORMALIZED)));

  // 10. Ensure Service Categories exist
  console.log('📦 Ensuring standard service categories exist...');
  await db
    .insert(serviceCategories)
    .values([
      {
        id: 'cat_products',
        nameAr: 'منتجات واحتياجات',
        nameEn: 'Products & Needs',
        descriptionAr: 'توصيل أسطوانات الغاز، مياه الشرب، صهاريج المياه، والديزل',
        descriptionEn: 'Delivery of gas cylinders, pure water, water tankers, and fuel',
        iconName: 'local_shipping_rounded',
        sortOrder: 1,
        isActive: true,
      },
      {
        id: 'cat_home_services',
        nameAr: 'خدمات منزلية',
        nameEn: 'Home Services',
        descriptionAr: 'صيانة الكهرباء، السباكة، التكييف، والنجارة',
        descriptionEn: 'Electrical, plumbing, AC, and home maintenance',
        iconName: 'home_repair_service_rounded',
        sortOrder: 2,
        isActive: true,
      },
      {
        id: 'cat_offers',
        nameAr: 'عروض وكوبونات',
        nameEn: 'Offers & Coupons',
        descriptionAr: 'خصومات حصرية وباقات توفير مميزة',
        descriptionEn: 'Exclusive discounts and promotional offers',
        iconName: 'local_offer_rounded',
        sortOrder: 3,
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  // 11. Insert Exactly ONE Initial Service: Gas (غاز) - 7.00 JOD
  console.log('🔥 Creating single initial service: غاز (Gas) - 7.00 JOD...');
  await db.insert(services).values({
    id: 'srv_gas_cylinder',
    categoryId: 'cat_products',
    nameAr: 'غاز',
    nameEn: 'Gas',
    descriptionAr: 'توصيل واستبدال أسطوانات الغاز للمنازل والمنشآت مع الفحص الفوري والتركيب الآمن.',
    descriptionEn: 'Gas cylinder delivery and refill for residential and commercial units with safety inspection.',
    type: 'delivery_product',
    basePrice: '7.00',
    unitAr: 'جرة',
    unitEn: 'Cylinder',
    requiresQuotation: false,
    isAvailable: true,
    isActive: true,
    providerId: null,
  });

  // 12. Insert Exactly ONE Service Option: Gas Cylinder (جرة غاز) - 7.00 JOD
  console.log('📦 Creating single initial service option: جرة غاز (Gas Cylinder) - 7.00 JOD...');
  await db.insert(serviceOptions).values({
    id: 'opt_gas_cylinder_standard',
    serviceId: 'srv_gas_cylinder',
    nameAr: 'جرة غاز',
    nameEn: 'Gas Cylinder',
    optionType: 'refill',
    size: '12.5 كغ',
    price: '7.00',
    unitAr: 'جرة',
    unitEn: 'Cylinder',
    sortOrder: 1,
    isAvailable: true,
    isActive: true,
  });

  // 13. Verify Clean Database State
  console.log('🔍 Verifying clean database state...');
  const postUsers = await db.select().from(users);
  const postProviders = await db.select().from(providers);
  const postServices = await db.select().from(services);
  const postServiceOptions = await db.select().from(serviceOptions);
  const postOrders = await db.select().from(orders);
  const postAddresses = await db.select().from(addresses);
  const postCoupons = await db.select().from(coupons);
  const postOffers = await db.select().from(offers);
  const postDelivery = await db.select().from(deliveryEmployees);
  const postProviderServices = await db.select().from(providerServices);

  const singleAdmin = postUsers[0];

  const summary: ResetSummary = {
    deletedUsers: Math.max(0, preUsers.length - postUsers.length),
    deletedProviders: preProviders.length,
    deletedServices: Math.max(0, preServices.length - postServices.length),
    deletedOrders: preOrders.length,
    deletedAddresses: preAddresses.length,
    deletedCoupons: preCoupons.length,
    deletedOffers: preOffers.length,
    deletedDeliveryEmployees: preDelivery.length,
    remainingUsers: postUsers.length,
    remainingProviders: postProviders.length,
    remainingServices: postServices.length,
    remainingServiceOptions: postServiceOptions.length,
    remainingOrders: postOrders.length,
    adminPhone: singleAdmin?.phoneNumber || TARGET_ADMIN_PHONE,
    adminRole: singleAdmin?.role || 'admin',
    serviceNameAr: postServices[0]?.nameAr || 'غاز',
    serviceNameEn: postServices[0]?.nameEn || 'Gas',
    gasPrice: `${postServices[0]?.basePrice || '7.00'} JOD`,
  };

  console.log(`
  ======================================================
  ✅ DATABASE DATA RESET COMPLETED SUCCESSFULLY!
  ======================================================
  👑 Admin Account: ${summary.adminPhone} (${summary.adminRole}) [Count: ${summary.remainingUsers}]
  🔥 Service: ${summary.serviceNameAr} / ${summary.serviceNameEn} - ${summary.gasPrice} [Count: ${summary.remainingServices}]
  📦 Service Option: جرة غاز / Gas Cylinder - 7.00 JOD [Count: ${summary.remainingServiceOptions}]
  🏢 Providers: ${summary.remainingProviders}
  🚚 Delivery Employees: ${postDelivery.length}
  📦 Provider Services: ${postProviderServices.length}
  📋 Orders: ${summary.remainingOrders}
  📍 Addresses: ${postAddresses.length}
  🎟️ Coupons: ${postCoupons.length}
  🌟 Offers: ${postOffers.length}
  ======================================================
  `);

  return summary;
}

// Direct execution when invoked via CLI
if (process.argv[1]?.endsWith('reset_database.ts') || process.argv[1]?.endsWith('reset_database.js')) {
  resetDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database reset failed:', err);
      process.exit(1);
    });
}

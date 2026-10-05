import { db } from './index.js';
import { sql } from '../config/database.js';
import { users, refreshTokens, authOtps } from './schema/users.schema.js';
import { orders } from './schema/orders.schema.js';
import { addresses } from './schema/addresses.schema.js';
import { loyaltyTransactions } from './schema/loyalty.schema.js';
import { notifications } from './schema/notifications.schema.js';
import { eq, or } from 'drizzle-orm';
import { normalizeJordanianPhone } from '../modules/auth/utils/phone.js';

/**
 * Safely migrate / promote the real Admin phone number (0790980947).
 * Removes test customer 'mm' and cleans up placeholder admins (0799999999, 0790000000).
 * Ensures exactly ONE account for the Admin phone with role='admin' without creating duplicate records.
 *
 * Usage:
 *   npx tsx src/db/migrate_admin_phone.ts --phone 0790980947 --name "مدير عام بتنحل"
 */
async function migrateAdminPhone() {
  const args = process.argv.slice(2);
  let phone = '0790980947';
  let name = 'مدير عام بتنحل';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone' && args[i + 1]) {
      phone = args[i + 1];
    } else if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1];
    }
  }

  const normalizedPhone = normalizeJordanianPhone(phone);

  console.log(`\n======================================================`);
  console.log(`👑 Starting Safe Admin Account Migration`);
  console.log(`📱 Target Admin Phone: ${normalizedPhone}`);
  console.log(`👤 Admin Name: ${name}`);
  console.log(`======================================================\n`);

  try {
    // 1. Find and safely remove test Customer account "mm" if present
    const existingWithTarget = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phoneNumber, normalizedPhone),
          eq(users.phoneNumber, '0790980947'),
          eq(users.phoneNumber, '+962790980947')
        )
      );

    for (const u of existingWithTarget) {
      if (u.role === 'customer') {
        console.log(`🗑️ Found test customer account "mm" (ID: ${u.id}). Cleaning related records...`);
        try {
          await db.delete(notifications).where(eq(notifications.userId, u.id));
        } catch (_) {}
        try {
          await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.userId, u.id));
        } catch (_) {}
        try {
          await db.delete(addresses).where(eq(addresses.userId, u.id));
        } catch (_) {}
        try {
          await db.delete(orders).where(eq(orders.customerId, u.id));
        } catch (_) {}
        try {
          await db.delete(refreshTokens).where(eq(refreshTokens.userId, u.id));
        } catch (_) {}
        await db.delete(users).where(eq(users.id, u.id));
        console.log(`✅ Removed test customer "mm" (${u.phoneNumber}).`);
      }
    }

    // 2. Remove old placeholder admin accounts (0799999999, 0790000000)
    const oldPlaceholderAdmins = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phoneNumber, '0799999999'),
          eq(users.phoneNumber, '+962799999999'),
          eq(users.phoneNumber, '0790000000'),
          eq(users.phoneNumber, '+962790000000')
        )
      );

    for (const oldAdmin of oldPlaceholderAdmins) {
      if (oldAdmin.phoneNumber !== normalizedPhone) {
        console.log(`🧹 Removing placeholder admin account [${oldAdmin.phoneNumber}] (ID: ${oldAdmin.id})...`);
        try {
          await db.delete(refreshTokens).where(eq(refreshTokens.userId, oldAdmin.id));
        } catch (_) {}
        await db.delete(users).where(eq(users.id, oldAdmin.id));
        console.log(`✅ Removed placeholder admin [${oldAdmin.phoneNumber}].`);
      }
    }

    // 3. Clean up any stale OTPs for target phone
    try {
      await db.delete(authOtps).where(eq(authOtps.phoneNumber, normalizedPhone));
    } catch (_) {}

    // 4. Create or Update the single real Admin account
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    let adminRecord;
    if (existingAdmin) {
      console.log(`ℹ️ Updating existing record for ${normalizedPhone} to ADMIN...`);
      const [promoted] = await db
        .update(users)
        .set({
          role: 'admin',
          name: name || existingAdmin.name || 'مدير عام بتنحل',
          isSuspended: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingAdmin.id))
        .returning();
      adminRecord = promoted;
      console.log(`✅ Successfully updated account to ADMIN (ID: ${adminRecord.id})`);
    } else {
      console.log(`ℹ️ Creating fresh primary Admin account for ${normalizedPhone}...`);
      const [newAdmin] = await db
        .insert(users)
        .values({
          phoneNumber: normalizedPhone,
          name,
          role: 'admin',
          isSuspended: false,
          walletBalance: '0.00',
          points: 0,
        })
        .returning();
      adminRecord = newAdmin;
      console.log(`✅ Successfully created primary ADMIN account (ID: ${adminRecord.id})`);
    }

    // 5. Verify final state in PostgreSQL
    console.log(`\n======================================================`);
    console.log(`🔍 Verification Summary:`);
    console.log(`======================================================`);

    const targetCheck = await db.select().from(users).where(eq(users.phoneNumber, normalizedPhone));
    console.log(`- Accounts with phone ${normalizedPhone}: ${targetCheck.length}`);
    targetCheck.forEach((u) => {
      console.log(`  * ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | Active: ${!u.isSuspended}`);
    });

    const activeAdmins = await db.select().from(users).where(eq(users.role, 'admin'));
    console.log(`\n👑 Active Admin Accounts:`);
    activeAdmins.forEach((a) => {
      console.log(`  * [${a.phoneNumber}] ${a.name} (ID: ${a.id})`);
    });

    console.log(`\n✅ Safe Admin Migration Completed Successfully!\n`);
  } catch (error) {
    console.error(`❌ Migration failed:`, error);
  } finally {
    await sql.end();
  }
}

migrateAdminPhone();


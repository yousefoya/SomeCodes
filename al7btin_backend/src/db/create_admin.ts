import { db } from './index.js';
import { sql } from '../config/database.js';
import { users } from './schema/users.schema.js';
import { eq } from 'drizzle-orm';
import { normalizeJordanianPhone } from '../modules/auth/utils/phone.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  let phone = '';
  let name = 'مدير النظام';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone' && args[i + 1]) {
      phone = args[i + 1];
    } else if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1];
    }
  }

  if (!phone) {
    phone = '0790000000'; // Default admin phone for development
  }

  const normalizedPhone = normalizeJordanianPhone(phone);

  console.log(`👑 Creating / Promoting Admin account: ${name} (${normalizedPhone})...`);

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    if (!existing) {
      const [admin] = await db
        .insert(users)
        .values({
          phoneNumber: normalizedPhone,
          name,
          role: 'admin',
        })
        .returning();
      console.log('✅ Created new ADMIN user successfully:', admin);
    } else {
      const [admin] = await db
        .update(users)
        .set({ role: 'admin', name, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning();
      console.log('✅ Promoted existing user to ADMIN successfully:', admin);
    }
  } catch (error) {
    console.error('❌ Failed to create admin account:', error);
  } finally {
    await sql.end();
  }
}

createAdmin();

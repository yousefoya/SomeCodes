import { db } from '../src/db/index.js';
import { sql } from '../src/config/database.js';

async function main() {
  const pList = await db.query.providers.findMany({ with: { services: true } });
  console.log('--- 🏢 PROVIDERS & ASSOCIATED SERVICES ---');
  pList.forEach(p => console.log(p.id, '|', p.nameAr, '| Services:', p.services.map(s => s.serviceId).join(', ')));

  const dList = await db.query.deliveryEmployees.findMany({ with: { provider: true, serviceCapabilities: true } });
  console.log('\n--- 🚗 DELIVERY EMPLOYEES & PROVIDER ASSOCIATION ---');
  dList.forEach(d => console.log(d.id, '|', d.name, '| Provider:', d.provider?.nameAr, '| Services:', d.serviceCapabilities.map(s => s.serviceId).join(', ')));

  await sql.end();
}

main().catch(console.error);

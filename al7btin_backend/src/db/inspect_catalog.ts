import { db } from './index.js';
import { serviceCategories } from './schema/categories.schema.js';
import { services, serviceOptions } from './schema/services.schema.js';
import { providers, providerServices } from './schema/providers.schema.js';

async function main() {
  const cats = await db.select().from(serviceCategories);
  console.log('Categories Count:', cats.length);
  console.log('Categories:', JSON.stringify(cats.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })), null, 2));

  const srvs = await db.select().from(services);
  console.log('Services Count:', srvs.length);
  console.log('Services:', JSON.stringify(srvs.map(s => ({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, categoryId: s.categoryId, status: s.status, isPublished: s.isPublished, isActive: s.isActive })), null, 2));

  const opts = await db.select().from(serviceOptions);
  console.log('Service Options Count:', opts.length);

  const provs = await db.select().from(providers);
  console.log('Providers Count:', provs.length);
  console.log('Providers:', JSON.stringify(provs.map(p => ({ id: p.id, nameAr: p.nameAr, isActive: p.isActive })), null, 2));

  const pServices = await db.select().from(providerServices);
  console.log('Provider Services Count:', pServices.length);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

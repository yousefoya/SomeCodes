import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { services } from '../../db/schema/services.schema.js';
import { users } from '../../db/schema/users.schema.js';
import { eq } from 'drizzle-orm';

const app = createApp();

describe('Phase A — Dynamic Service Engine APIs & Lifecycle', () => {
  let adminToken: string;
  let agentToken: string;
  let customerToken: string;

  const testDynamicServiceId = `srv_dyn_test_${Date.now()}`;

  before(async () => {
    const [adminDb] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    const [agentDb] = await db.select().from(users).where(eq(users.role, 'customer_service_agent')).limit(1);
    const [custDb] = await db.select().from(users).where(eq(users.role, 'customer')).limit(1);

    adminToken = generateTokens(adminDb || { id: 'd603e5db-206a-4a0b-b6cd-c34293c8ae08', role: 'admin', phoneNumber: '0790980947', isSuspended: false }).accessToken;
    agentToken = generateTokens(agentDb || { id: 'agent-fallback', role: 'customer_service_agent', phoneNumber: '0791111111', isSuspended: false }).accessToken;
    customerToken = generateTokens(custDb || { id: 'cust-fallback', role: 'customer', phoneNumber: '+962799990001', isSuspended: false }).accessToken;
  });

  after(async () => {
    // Clean up created test services safely
    await db.delete(services).where(eq(services.id, testDynamicServiceId));
  });

  describe('1. Create Service & Builder Draft Management', () => {
    it('creates a new generic service in draft status', async () => {
      const res = await request(app)
        .post('/api/v1/services/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: testDynamicServiceId,
          categoryId: 'cat_home_services',
          nameAr: 'خدمة صيانة مكيفات ديناميكية',
          nameEn: 'Dynamic AC Maintenance',
          descriptionAr: 'تنظيف وصيانة وحدات التكييف',
          descriptionEn: 'AC cleaning and maintenance service',
          type: 'home_service',
          basePrice: 25.0,
          unitAr: 'وحدة',
          unitEn: 'Unit',
          status: 'draft',
          slaHours: 12,
          minOrderValue: 20.0,
          maxOrderValue: 300.0,
          options: [
            { nameAr: 'تنظيف شامل', nameEn: 'Deep Clean', price: 30.0 },
            { nameAr: 'شحن غاز تبريد', nameEn: 'Gas Refill', price: 45.0 },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, testDynamicServiceId);
      assert.equal(res.body.data.status, 'draft');
      assert.equal(res.body.data.isPublished, false);
      assert.equal(res.body.data.currentVersion, 1);
    });

    it('rejects agent role from creating services (403 FORBIDDEN_PERMISSION)', async () => {
      const res = await request(app)
        .post('/api/v1/services/admin')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          categoryId: 'cat_home_services',
          nameAr: 'اختبار غير مصرح',
          nameEn: 'Unauthorized Test',
          basePrice: 10.0,
          unitAr: 'خدمة',
          unitEn: 'Service',
        });

      assert.equal(res.status, 403);
    });

    it('retrieves builder data including draft and relations', async () => {
      const res = await request(app)
        .get(`/api/v1/services/admin/${testDynamicServiceId}/builder`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.service.id, testDynamicServiceId);
      assert.equal(Array.isArray(res.body.data.options), true);
      assert.equal(res.body.data.options.length, 2);
    });

    it('saves draft schema in builder', async () => {
      const draftPayload = {
        draftSchema: {
          step: 2,
          proposedFields: [
            { key: 'unitsCount', fieldType: 'counter', labelAr: 'عدد المكيفات', labelEn: 'AC Units' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/v1/services/admin/${testDynamicServiceId}/builder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(draftPayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  describe('2. Versioned Publishing Workflow', () => {
    it('publishes dynamic service configuration, increments version, and creates immutable snapshot', async () => {
      const publishPayload = {
        changelog: 'الإصدار الأول: إضافة حقول تحديد عدد الوحدات وخيارات الصيانة الإضافية',
        fields: [
          {
            key: 'unitsCount',
            labelAr: 'عدد الوحدات',
            labelEn: 'Units Count',
            fieldType: 'counter',
            defaultValue: 1,
            min: 1,
            max: 10,
            isRequired: true,
          },
          {
            key: 'needsFilterReplacement',
            labelAr: 'استبدال الفلاتر؟',
            labelEn: 'Replace Filters?',
            fieldType: 'toggle',
            defaultValue: false,
            isRequired: false,
          },
        ],
        rules: [
          {
            ruleName: 'Alert on multiple AC units',
            condition: {
              operator: 'AND',
              expressions: [{ field: 'unitsCount', op: 'gte', value: 3 }],
            },
            actions: [
              {
                type: 'SHOW_ALERT',
                messageAr: 'خصم تلقائي 10% للطلبات المكونة من 3 وحدات فأكثر',
                messageEn: 'Automatic 10% discount for 3+ units',
                severity: 'info',
              },
            ],
          },
        ],
        pricingRules: [
          {
            ruleType: 'field_multiplier',
            titleAr: 'سعر الوحدة الإضافية',
            titleEn: 'Additional unit rate',
            targetField: 'unitsCount',
            calculationFormula: { ratePerUnit: 15.0 },
          },
          {
            ruleType: 'field_addon',
            titleAr: 'رسوم استبدال الفلاتر',
            titleEn: 'Filter replacement fee',
            targetField: 'needsFilterReplacement',
            calculationFormula: { fixedAmount: 10.0 },
          },
        ],
        requirements: [
          {
            requirementType: 'provider_capability',
            capabilityKey: 'ac_technician',
            capabilityNameAr: 'فني تكييف معتمد',
            capabilityNameEn: 'Certified AC Technician',
            isRequired: true,
          },
        ],
      };

      const res = await request(app)
        .post(`/api/v1/services/admin/${testDynamicServiceId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(publishPayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.service.status, 'published');
      assert.equal(res.body.data.service.isPublished, true);
      assert.equal(res.body.data.service.currentVersion, 2);
      assert.equal(res.body.data.version.version, 2);
      assert.ok(res.body.data.version.changelog.includes('الإصدار الأول'));
    });

    it('lists published version history', async () => {
      const res = await request(app)
        .get(`/api/v1/services/admin/${testDynamicServiceId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(Array.isArray(res.body.data), true);
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].version, 2);
    });

    it('fetches specific historical version snapshot', async () => {
      const res = await request(app)
        .get(`/api/v1/services/admin/${testDynamicServiceId}/versions/2`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.version, 2);
      assert.equal(res.body.data.schemaSnapshot.fields.length, 2);
      assert.equal(res.body.data.schemaSnapshot.pricingRules.length, 2);
    });
  });

  describe('3. Public Configuration & Authoritative Price Quote APIs', () => {
    it('customer retrieves active dynamic configuration schema', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${testDynamicServiceId}/configuration`)
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.service.id, testDynamicServiceId);
      assert.equal(res.body.data.fields.length, 2);
      assert.equal(res.body.data.rules.length, 1);
      assert.equal(res.body.data.pricingRules.length, 2);
      assert.equal(res.body.data.requirements.length, 1);
    });

    it('calculates authoritative price quote on server with itemized breakdown', async () => {
      const res = await request(app)
        .post(`/api/v1/services/${testDynamicServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          answers: {
            unitsCount: 2,
            needsFilterReplacement: true,
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      // Base: 25 + (2 units * 15) + (filter addon: 10) = 65 JOD
      assert.equal(res.body.data.basePrice, 25.0);
      assert.equal(res.body.data.subtotal, 65.0);
      assert.equal(res.body.data.deliveryFee, 0.0);
      assert.equal(res.body.data.totalAmount, 65.0);
      assert.equal(res.body.data.fieldAddons.length, 2);
    });

    it('triggers alerts in calculation when condition met', async () => {
      const res = await request(app)
        .post(`/api/v1/services/${testDynamicServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          answers: {
            unitsCount: 3,
            needsFilterReplacement: false,
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.activeAlerts.length, 1);
      assert.ok(res.body.data.activeAlerts[0].messageAr.includes('خصم تلقائي 10%'));
    });
  });

  describe('4. Duplication, Unpublishing & Archiving Lifecycle', () => {
    it('duplicates service into a new draft with cloned fields and rules', async () => {
      const res = await request(app)
        .post(`/api/v1/services/admin/${testDynamicServiceId}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.nameAr.includes('(نسخة)'));
      assert.equal(res.body.data.status, 'draft');
      assert.equal(res.body.data.isPublished, false);

      // Clean up duplicated service
      await db.delete(services).where(eq(services.id, res.body.data.id));
    });

    it('unpublishes service back to in_review status', async () => {
      const res = await request(app)
        .post(`/api/v1/services/admin/${testDynamicServiceId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'in_review');
      assert.equal(res.body.data.isPublished, false);
    });

    it('archives service', async () => {
      const res = await request(app)
        .post(`/api/v1/services/admin/${testDynamicServiceId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'archived');
      assert.equal(res.body.data.isActive, false);
    });
  });
});

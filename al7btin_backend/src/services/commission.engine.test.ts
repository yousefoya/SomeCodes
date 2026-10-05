import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { CommissionEngine } from './commission.engine.js';
import { db } from '../db/index.js';
import { commissionRules } from '../db/schema/finance.schema.js';
import { eq } from 'drizzle-orm';

describe('💰 CommissionEngine Unit Tests', () => {
  let testRuleIds: string[] = [];

  before(async () => {
    // Insert deterministic test commission rules
    const [percentageRule] = await db
      .insert(commissionRules)
      .values({
        nameAr: 'عمولة تجريبية 15%',
        nameEn: 'Test Percentage 15%',
        ruleType: 'percentage',
        percentageRate: '15.00',
        minCommission: '1.00',
        maxCommission: '30.00',
        priority: 10,
        providerTier: 'gold',
        isActive: true,
      })
      .returning();
    testRuleIds.push(percentageRule.id);

    const [fixedRule] = await db
      .insert(commissionRules)
      .values({
        nameAr: 'عمولة تجريبية ثابتة 3 دنانير',
        nameEn: 'Test Fixed 3 JOD',
        ruleType: 'fixed',
        fixedAmount: '3.00',
        priority: 20,
        providerTier: 'silver',
        isActive: true,
      })
      .returning();
    testRuleIds.push(fixedRule.id);

    const [hybridRule] = await db
      .insert(commissionRules)
      .values({
        nameAr: 'عمولة هجينة 5% + 2 دينار',
        nameEn: 'Test Hybrid 5% + 2 JOD',
        ruleType: 'hybrid',
        percentageRate: '5.00',
        fixedAmount: '2.00',
        priority: 30,
        providerTier: 'platinum',
        isActive: true,
      })
      .returning();
    testRuleIds.push(hybridRule.id);
  });

  after(async () => {
    // Cleanup test rules
    for (const id of testRuleIds) {
      await db.delete(commissionRules).where(eq(commissionRules.id, id));
    }
  });

  it('1. Calculates standard percentage commission correctly', async () => {
    const res = await CommissionEngine.calculateCommission({
      providerId: 'prov_test_1',
      providerTier: 'gold',
      grossAmount: 100.0,
    });

    assert.equal(res.ruleType, 'percentage');
    assert.equal(res.grossAmount, 100.0);
    assert.equal(res.commissionAmount, 15.0);
    assert.equal(res.netProviderAmount, 85.0);
    assert.equal(res.minCommissionApplied, false);
    assert.equal(res.maxCommissionApplied, false);
  });

  it('2. Calculates fixed commission correctly', async () => {
    const res = await CommissionEngine.calculateCommission({
      providerId: 'prov_test_2',
      providerTier: 'silver',
      grossAmount: 40.0,
    });

    assert.equal(res.ruleType, 'fixed');
    assert.equal(res.grossAmount, 40.0);
    assert.equal(res.commissionAmount, 3.0);
    assert.equal(res.netProviderAmount, 37.0);
  });

  it('3. Calculates hybrid commission correctly (5% + 2.00 JOD)', async () => {
    const res = await CommissionEngine.calculateCommission({
      providerId: 'prov_test_3',
      providerTier: 'platinum',
      grossAmount: 100.0,
    });

    assert.equal(res.ruleType, 'hybrid');
    assert.equal(res.grossAmount, 100.0);
    // (100 * 5%) + 2 = 5 + 2 = 7.00
    assert.equal(res.commissionAmount, 7.0);
    assert.equal(res.netProviderAmount, 93.0);
  });

  it('4. Enforces minimum commission floor cap', async () => {
    const res = await CommissionEngine.calculateCommission({
      providerId: 'prov_test_4',
      providerTier: 'gold',
      grossAmount: 4.0, // 15% of 4 JOD = 0.60 JOD, below 1.00 JOD min floor
    });

    assert.equal(res.commissionAmount, 1.0);
    assert.equal(res.netProviderAmount, 3.0);
    assert.equal(res.minCommissionApplied, true);
  });

  it('5. Enforces maximum commission ceiling cap', async () => {
    const res = await CommissionEngine.calculateCommission({
      providerId: 'prov_test_5',
      providerTier: 'gold',
      grossAmount: 500.0, // 15% of 500 JOD = 75 JOD, above 30.00 JOD max ceiling
    });

    assert.equal(res.commissionAmount, 30.0);
    assert.equal(res.netProviderAmount, 470.0);
    assert.equal(res.maxCommissionApplied, true);
  });

  it('6. Produces explainable calculation breakdown snapshot', async () => {
    const res = await CommissionEngine.calculateCommission({
      providerId: 'prov_test_6',
      providerTier: 'gold',
      grossAmount: 50.0,
    });

    assert.ok(res.ruleSnapshot);
    assert.ok(res.calculationExplanation);
    assert.ok(res.calculationExplanation.formula.includes('15%'));
    assert.equal(res.calculationExplanation.finalCommission, 7.5);
    assert.equal(res.calculationExplanation.netToProvider, 42.5);
  });
});

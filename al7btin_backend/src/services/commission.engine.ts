import { db } from '../db/index.js';
import { commissionRules } from '../db/schema/finance.schema.js';
import { eq, and, or, isNull, desc } from 'drizzle-orm';

export interface CommissionCalculationInput {
  providerId: string;
  serviceId?: string;
  categoryId?: string;
  providerTier?: string;
  grossAmount: number; // in JOD
  timing?: 'on_order_acceptance' | 'on_service_start' | 'on_service_completion' | 'on_payment_capture';
}

export interface CommissionCalculationResult {
  ruleId: string | null;
  ruleNameAr: string;
  ruleNameEn: string;
  ruleType: 'percentage' | 'fixed' | 'hybrid';
  percentageRate: number;
  fixedAmount: number;
  grossAmount: number;
  commissionAmount: number;
  netProviderAmount: number;
  minCommissionApplied: boolean;
  maxCommissionApplied: boolean;
  timing: string;
  mode: 'postpaid' | 'prepaid_deposit';
  ruleSnapshot: Record<string, any>;
  calculationExplanation: {
    formula: string;
    gross: number;
    rawCommission: number;
    finalCommission: number;
    netToProvider: number;
  };
}

export class CommissionEngine {
  /**
   * Resolves the most specific active commission rule for a given context
   */
  public static async resolveRule(
    providerId: string,
    serviceId?: string,
    categoryId?: string,
    providerTier: string = 'all'
  ) {
    // Fetch all active rules
    const rules = await db
      .select()
      .from(commissionRules)
      .where(eq(commissionRules.isActive, true))
      .orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt));

    // Specificity matching hierarchy:
    // 1. Provider + Service (Score: 1000)
    // 2. Provider + Category (Score: 800)
    // 3. Provider only (Score: 600)
    // 4. Service only (Score: 500)
    // 5. Category only (Score: 400)
    // 6. Tier match (Score: 200)
    // 7. Global fallback (Score: 100)

    let bestRule: any = null;
    let highestScore = -1;

    for (const rule of rules) {
      let score = 0;
      const matchesProvider = rule.providerId === providerId;
      const matchesService = serviceId && rule.serviceId === serviceId;
      const matchesCategory = categoryId && rule.categoryId === categoryId;
      const matchesTier = rule.providerTier === 'all' || rule.providerTier === providerTier;

      if (rule.providerId && !matchesProvider) continue;
      if (rule.serviceId && !matchesService) continue;
      if (rule.categoryId && !matchesCategory) continue;
      if (rule.providerTier !== 'all' && !matchesTier) continue;

      if (matchesProvider && matchesService) {
        score = 1000;
      } else if (matchesProvider && matchesCategory) {
        score = 800;
      } else if (matchesProvider && !rule.serviceId && !rule.categoryId) {
        score = 600;
      } else if (matchesService && !rule.providerId) {
        score = 500;
      } else if (matchesCategory && !rule.providerId) {
        score = 400;
      } else if (rule.providerTier !== 'all' && matchesTier) {
        score = 200;
      } else {
        score = 100; // Global fallback
      }

      // Add user-defined priority weight
      score += (rule.priority || 0) * 10;

      if (score > highestScore) {
        highestScore = score;
        bestRule = rule;
      }
    }

    return bestRule;
  }

  /**
   * Calculates commission deterministically and returns detailed breakdown & snapshot
   */
  public static async calculateCommission(
    input: CommissionCalculationInput
  ): Promise<CommissionCalculationResult> {
    const gross = Math.max(0, Number(input.grossAmount.toFixed(2)));
    const rule = await this.resolveRule(
      input.providerId,
      input.serviceId,
      input.categoryId,
      input.providerTier
    );

    // Default Fallback if no rule exists in database (10% standard, 0 delivery fee invariant)
    const ruleType = rule ? (rule.ruleType as 'percentage' | 'fixed' | 'hybrid') : 'percentage';
    const percentageRate = rule ? Number(rule.percentageRate) : 10.0;
    const fixedAmount = rule ? Number(rule.fixedAmount) : 0.0;
    const minCommission = rule ? Number(rule.minCommission) : 0.0;
    const maxCommission = rule && rule.maxCommission ? Number(rule.maxCommission) : null;
    const timing = input.timing || (rule ? rule.timing : 'on_service_completion');
    const mode = rule ? (rule.mode as 'postpaid' | 'prepaid_deposit') : 'postpaid';

    let rawCommission = 0;
    let formula = '';

    if (ruleType === 'percentage') {
      rawCommission = (gross * percentageRate) / 100;
      formula = `(${gross} JOD * ${percentageRate}%)`;
    } else if (ruleType === 'fixed') {
      rawCommission = fixedAmount;
      formula = `${fixedAmount} JOD Fixed`;
    } else if (ruleType === 'hybrid') {
      rawCommission = (gross * percentageRate) / 100 + fixedAmount;
      formula = `(${gross} JOD * ${percentageRate}%) + ${fixedAmount} JOD`;
    }

    let minApplied = false;
    let maxApplied = false;
    let finalCommission = rawCommission;

    if (minCommission > 0 && finalCommission < minCommission) {
      finalCommission = minCommission;
      minApplied = true;
      formula += ` -> Min Cap Applied (${minCommission} JOD)`;
    }

    if (maxCommission !== null && maxCommission > 0 && finalCommission > maxCommission) {
      finalCommission = maxCommission;
      maxApplied = true;
      formula += ` -> Max Cap Applied (${maxCommission} JOD)`;
    }

    // Round to 2 decimal places (cents/piastres)
    finalCommission = Number(Math.min(gross, Math.max(0, finalCommission)).toFixed(2));
    const netProviderAmount = Number((gross - finalCommission).toFixed(2));

    const ruleSnapshot = rule
      ? {
          id: rule.id,
          nameAr: rule.nameAr,
          nameEn: rule.nameEn,
          ruleType: rule.ruleType,
          percentageRate: rule.percentageRate,
          fixedAmount: rule.fixedAmount,
          minCommission: rule.minCommission,
          maxCommission: rule.maxCommission,
          timing: rule.timing,
          mode: rule.mode,
          serviceId: rule.serviceId,
          categoryId: rule.categoryId,
          providerId: rule.providerId,
          providerTier: rule.providerTier,
        }
      : {
          id: null,
          nameAr: 'العمولة الافتراضية للنظام (10%)',
          nameEn: 'System Default Commission (10%)',
          ruleType: 'percentage',
          percentageRate: '10.00',
          fixedAmount: '0.00',
          minCommission: '0.00',
          maxCommission: null,
          timing: 'on_service_completion',
          mode: 'postpaid',
        };

    return {
      ruleId: rule?.id || null,
      ruleNameAr: rule?.nameAr || 'العمولة الافتراضية للنظام (10%)',
      ruleNameEn: rule?.nameEn || 'System Default Commission (10%)',
      ruleType,
      percentageRate,
      fixedAmount,
      grossAmount: gross,
      commissionAmount: finalCommission,
      netProviderAmount,
      minCommissionApplied: minApplied,
      maxCommissionApplied: maxApplied,
      timing,
      mode,
      ruleSnapshot,
      calculationExplanation: {
        formula,
        gross,
        rawCommission: Number(rawCommission.toFixed(2)),
        finalCommission,
        netToProvider: netProviderAmount,
      },
    };
  }
}

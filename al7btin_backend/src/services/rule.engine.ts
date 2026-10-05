/**
 * BTIN7AL (بتنحل) Generic Declarative Rule Engine
 *
 * Evaluates conditional rules against customer input answers.
 * Security & Reliability Guarantees:
 * - Pure data interpretation (NO eval, NO new Function, NO arbitrary code execution)
 * - Safe null/undefined handling and type coercion for numbers/booleans
 * - Deterministic, side-effect free evaluation
 */

export type RuleOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty';

export interface RuleExpression {
  field: string;
  op: RuleOperator;
  value?: any;
}

export interface RuleCondition {
  operator?: 'AND' | 'OR';
  expressions?: RuleExpression[];
  // Support legacy single expression or direct fields
  field?: string;
  op?: RuleOperator;
  value?: any;
}

export type RuleActionType =
  | 'SHOW_FIELD'
  | 'HIDE_FIELD'
  | 'REQUIRE_FIELD'
  | 'UNREQUIRE_FIELD'
  | 'SHOW_ALERT'
  | 'REQUIRE_CAPABILITY';

export interface RuleAction {
  type: RuleActionType;
  targetField?: string;
  messageAr?: string;
  messageEn?: string;
  severity?: 'info' | 'warning' | 'error';
  capabilityKey?: string;
  payload?: any;
}

export interface ServiceRuleDefinition {
  id?: string;
  ruleName?: string;
  condition: RuleCondition;
  actions: RuleAction[];
  priority?: number;
  isActive?: boolean;
}

export interface RuleEvaluationResult {
  visibleFields: Set<string>;
  hiddenFields: Set<string>;
  requiredFields: Set<string>;
  unrequiredFields: Set<string>;
  alerts: Array<{
    messageAr: string;
    messageEn: string;
    severity: 'info' | 'warning' | 'error';
    targetField?: string;
  }>;
  requiredCapabilities: Set<string>;
  matchedRules: Array<{
    ruleId?: string;
    ruleName?: string;
    actions: RuleAction[];
  }>;
}

export class RuleEngine {
  /**
   * Safely evaluate a single comparison expression
   */
  public evaluateExpression(expression: RuleExpression, answers: Record<string, any>): boolean {
    const { field, op, value: targetValue } = expression;
    const actualValue = answers[field];

    switch (op) {
      case 'eq':
        if (actualValue === targetValue) return true;
        if (typeof targetValue === 'boolean') {
          return Boolean(actualValue) === targetValue;
        }
        if (typeof targetValue === 'number') {
          return Number(actualValue) === targetValue;
        }
        return String(actualValue ?? '').trim() === String(targetValue ?? '').trim();

      case 'neq':
        if (typeof targetValue === 'boolean') {
          return Boolean(actualValue) !== targetValue;
        }
        if (typeof targetValue === 'number') {
          return Number(actualValue) !== targetValue;
        }
        return String(actualValue ?? '').trim() !== String(targetValue ?? '').trim();

      case 'gt':
        return Number(actualValue) > Number(targetValue);

      case 'gte':
        return Number(actualValue) >= Number(targetValue);

      case 'lt':
        return Number(actualValue) < Number(targetValue);

      case 'lte':
        return Number(actualValue) <= Number(targetValue);

      case 'in':
        if (!Array.isArray(targetValue)) return false;
        return targetValue.some((item) => String(item) === String(actualValue));

      case 'not_in':
        if (!Array.isArray(targetValue)) return true;
        return !targetValue.some((item) => String(item) === String(actualValue));

      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.some((item) => String(item) === String(targetValue));
        }
        if (typeof actualValue === 'string') {
          return actualValue.toLowerCase().includes(String(targetValue ?? '').toLowerCase());
        }
        return false;

      case 'is_empty':
        if (actualValue === null || actualValue === undefined) return true;
        if (typeof actualValue === 'string') return actualValue.trim().length === 0;
        if (Array.isArray(actualValue)) return actualValue.length === 0;
        if (typeof actualValue === 'boolean') return actualValue === false;
        return false;

      case 'is_not_empty':
        if (actualValue === null || actualValue === undefined) return false;
        if (typeof actualValue === 'string') return actualValue.trim().length > 0;
        if (Array.isArray(actualValue)) return actualValue.length > 0;
        if (typeof actualValue === 'boolean') return actualValue === true;
        return true;

      default:
        return false;
    }
  }

  /**
   * Safely evaluate a rule condition (supports AND/OR logic)
   */
  public evaluateCondition(condition: RuleCondition, answers: Record<string, any>): boolean {
    if (!condition) return true;

    // Single flat expression fallback
    if (condition.field && condition.op) {
      return this.evaluateExpression(
        { field: condition.field, op: condition.op, value: condition.value },
        answers
      );
    }

    const expressions = condition.expressions || [];
    if (expressions.length === 0) return true;

    const operator = (condition.operator || 'AND').toUpperCase();

    if (operator === 'OR') {
      return expressions.some((expr) => this.evaluateExpression(expr, answers));
    }

    // Default to AND
    return expressions.every((expr) => this.evaluateExpression(expr, answers));
  }

  /**
   * Evaluate a full set of service rules and compute resultant field visibility,
   * requirements, alerts, and capability demands.
   */
  public evaluateRules(
    rules: ServiceRuleDefinition[],
    answers: Record<string, any> = {},
    allFieldKeys: string[] = []
  ): RuleEvaluationResult {
    const visibleFields = new Set<string>(allFieldKeys);
    const hiddenFields = new Set<string>();
    const requiredFields = new Set<string>();
    const unrequiredFields = new Set<string>();
    const alerts: RuleEvaluationResult['alerts'] = [];
    const requiredCapabilities = new Set<string>();
    const matchedRules: RuleEvaluationResult['matchedRules'] = [];

    // Sort rules by priority ascending (lower priority number executes first)
    const activeRules = rules
      .filter((r) => r.isActive !== false)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const rule of activeRules) {
      const isMatched = this.evaluateCondition(rule.condition, answers);

      if (isMatched) {
        matchedRules.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          actions: rule.actions || [],
        });

        for (const action of rule.actions || []) {
          switch (action.type) {
            case 'SHOW_FIELD':
              if (action.targetField) {
                visibleFields.add(action.targetField);
                hiddenFields.delete(action.targetField);
              }
              break;

            case 'HIDE_FIELD':
              if (action.targetField) {
                hiddenFields.add(action.targetField);
                visibleFields.delete(action.targetField);
              }
              break;

            case 'REQUIRE_FIELD':
              if (action.targetField) {
                requiredFields.add(action.targetField);
                unrequiredFields.delete(action.targetField);
              }
              break;

            case 'UNREQUIRE_FIELD':
              if (action.targetField) {
                unrequiredFields.add(action.targetField);
                requiredFields.delete(action.targetField);
              }
              break;

            case 'SHOW_ALERT':
              if (action.messageAr || action.messageEn) {
                alerts.push({
                  messageAr: action.messageAr || action.messageEn || '',
                  messageEn: action.messageEn || action.messageAr || '',
                  severity: action.severity || 'info',
                  targetField: action.targetField,
                });
              }
              break;

            case 'REQUIRE_CAPABILITY':
              if (action.capabilityKey) {
                requiredCapabilities.add(action.capabilityKey);
              }
              break;
          }
        }
      }
    }

    return {
      visibleFields,
      hiddenFields,
      requiredFields,
      unrequiredFields,
      alerts,
      requiredCapabilities,
      matchedRules,
    };
  }
}

export const ruleEngine = new RuleEngine();

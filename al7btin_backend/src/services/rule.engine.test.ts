import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ruleEngine, RuleExpression, RuleCondition, ServiceRuleDefinition } from './rule.engine.js';

describe('Generic Declarative Rule Engine', () => {
  describe('Operator Evaluation', () => {
    it('evaluates equality ("eq")', () => {
      assert.equal(ruleEngine.evaluateExpression({ field: 'size', op: 'eq', value: 'large' }, { size: 'large' }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'size', op: 'eq', value: 'large' }, { size: 'small' }), false);
      assert.equal(ruleEngine.evaluateExpression({ field: 'hasLift', op: 'eq', value: true }, { hasLift: true }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'hasLift', op: 'eq', value: false }, { hasLift: false }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'count', op: 'eq', value: 5 }, { count: 5 }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'count', op: 'eq', value: 5 }, { count: '5' }), true);
    });

    it('evaluates inequality ("neq")', () => {
      assert.equal(ruleEngine.evaluateExpression({ field: 'type', op: 'neq', value: 'express' }, { type: 'standard' }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'type', op: 'neq', value: 'express' }, { type: 'express' }), false);
    });

    it('evaluates numeric comparisons ("gt", "gte", "lt", "lte")', () => {
      assert.equal(ruleEngine.evaluateExpression({ field: 'floor', op: 'gt', value: 2 }, { floor: 3 }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'floor', op: 'gt', value: 2 }, { floor: 2 }), false);

      assert.equal(ruleEngine.evaluateExpression({ field: 'floor', op: 'gte', value: 2 }, { floor: 2 }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'floor', op: 'gte', value: 2 }, { floor: 1 }), false);

      assert.equal(ruleEngine.evaluateExpression({ field: 'workers', op: 'lt', value: 4 }, { workers: 3 }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'workers', op: 'lt', value: 4 }, { workers: 4 }), false);

      assert.equal(ruleEngine.evaluateExpression({ field: 'workers', op: 'lte', value: 4 }, { workers: 4 }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'workers', op: 'lte', value: 4 }, { workers: 5 }), false);
    });

    it('evaluates set inclusion ("in", "not_in")', () => {
      const exprIn: RuleExpression = { field: 'city', op: 'in', value: ['Amman', 'Zarqa', 'Irbid'] };
      assert.equal(ruleEngine.evaluateExpression(exprIn, { city: 'Amman' }), true);
      assert.equal(ruleEngine.evaluateExpression(exprIn, { city: 'Aqaba' }), false);

      const exprNotIn: RuleExpression = { field: 'city', op: 'not_in', value: ['Amman', 'Zarqa'] };
      assert.equal(ruleEngine.evaluateExpression(exprNotIn, { city: 'Aqaba' }), true);
      assert.equal(ruleEngine.evaluateExpression(exprNotIn, { city: 'Amman' }), false);
    });

    it('evaluates substring and array containment ("contains")', () => {
      assert.equal(ruleEngine.evaluateExpression({ field: 'tags', op: 'contains', value: 'heavy' }, { tags: ['fragile', 'heavy'] }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'tags', op: 'contains', value: 'glass' }, { tags: ['fragile', 'heavy'] }), false);
      assert.equal(ruleEngine.evaluateExpression({ field: 'notes', op: 'contains', value: 'urgent' }, { notes: 'Please handle this urgent request' }), true);
    });

    it('evaluates emptiness ("is_empty", "is_not_empty")', () => {
      assert.equal(ruleEngine.evaluateExpression({ field: 'notes', op: 'is_empty' }, { notes: '' }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'notes', op: 'is_empty' }, { notes: null }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'notes', op: 'is_empty' }, {}), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'notes', op: 'is_empty' }, { notes: 'hello' }), false);

      assert.equal(ruleEngine.evaluateExpression({ field: 'photos', op: 'is_not_empty' }, { photos: ['url1'] }), true);
      assert.equal(ruleEngine.evaluateExpression({ field: 'photos', op: 'is_not_empty' }, { photos: [] }), false);
    });
  });

  describe('Logical Combinators (AND / OR)', () => {
    it('evaluates AND conditions (all must match)', () => {
      const condition: RuleCondition = {
        operator: 'AND',
        expressions: [
          { field: 'hasElevator', op: 'eq', value: false },
          { field: 'floor', op: 'gte', value: 3 },
        ],
      };

      assert.equal(ruleEngine.evaluateCondition(condition, { hasElevator: false, floor: 4 }), true);
      assert.equal(ruleEngine.evaluateCondition(condition, { hasElevator: true, floor: 4 }), false);
      assert.equal(ruleEngine.evaluateCondition(condition, { hasElevator: false, floor: 2 }), false);
    });

    it('evaluates OR conditions (any must match)', () => {
      const condition: RuleCondition = {
        operator: 'OR',
        expressions: [
          { field: 'package', op: 'eq', value: 'vip' },
          { field: 'isUrgent', op: 'eq', value: true },
        ],
      };

      assert.equal(ruleEngine.evaluateCondition(condition, { package: 'vip', isUrgent: false }), true);
      assert.equal(ruleEngine.evaluateCondition(condition, { package: 'standard', isUrgent: true }), true);
      assert.equal(ruleEngine.evaluateCondition(condition, { package: 'standard', isUrgent: false }), false);
    });
  });

  describe('Action Evaluation and Result Computation', () => {
    it('computes visibility, requirements, alerts, and required capabilities', () => {
      const rules: ServiceRuleDefinition[] = [
        {
          id: 'rule_1',
          ruleName: 'Show heavy lifting options when truck is large',
          condition: {
            operator: 'AND',
            expressions: [{ field: 'truckSize', op: 'eq', value: 'large' }],
          },
          actions: [
            { type: 'SHOW_FIELD', targetField: 'extraWorkers' },
            { type: 'REQUIRE_CAPABILITY', capabilityKey: 'truck_large' },
            {
              type: 'SHOW_ALERT',
              messageAr: 'تتطلب الشاحنة الكبيرة مساحة اصطفاف واسعة',
              messageEn: 'Large truck requires wide parking space',
              severity: 'warning',
            },
          ],
        },
        {
          id: 'rule_2',
          ruleName: 'Require floor number when elevator is false',
          condition: {
            operator: 'AND',
            expressions: [{ field: 'hasElevator', op: 'eq', value: false }],
          },
          actions: [
            { type: 'REQUIRE_FIELD', targetField: 'floorNumber' },
          ],
        },
        {
          id: 'rule_3',
          ruleName: 'Hide piano moving if no heavy items checked',
          condition: {
            operator: 'AND',
            expressions: [{ field: 'hasHeavyItems', op: 'eq', value: false }],
          },
          actions: [
            { type: 'HIDE_FIELD', targetField: 'pianoDetails' },
          ],
        },
      ];

      const allFields = ['truckSize', 'extraWorkers', 'hasElevator', 'floorNumber', 'hasHeavyItems', 'pianoDetails'];

      const answers = {
        truckSize: 'large',
        hasElevator: false,
        hasHeavyItems: false,
      };

      const result = ruleEngine.evaluateRules(rules, answers, allFields);

      assert.equal(result.visibleFields.has('extraWorkers'), true);
      assert.equal(result.hiddenFields.has('pianoDetails'), true);
      assert.equal(result.requiredFields.has('floorNumber'), true);
      assert.equal(result.requiredCapabilities.has('truck_large'), true);
      assert.equal(result.alerts.length, 1);
      assert.equal(result.alerts[0].severity, 'warning');
      assert.ok(result.alerts[0].messageAr.includes('مساحة اصطفاف'));
    });
  });
});

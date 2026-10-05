import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  providerMatchingEngine,
  calculateHaversineDistanceKm,
} from './provider-matching.engine.js';

describe('🧠 Smart Provider Matching Engine Test Suite', () => {
  it('1. Calculates accurate Haversine distance between Amman coordinates', () => {
    // 7th Circle (31.9539, 35.8617) to Abdali (31.9632, 35.9106) ~ 4.7 km
    const dist = calculateHaversineDistanceKm(31.9539, 35.8617, 31.9632, 35.9106);
    assert(dist > 4.0 && dist < 6.0, `Distance should be ~4.7km, got ${dist}`);
  });

  it('2. Retrieves default dispatch settings from database', async () => {
    const settings = await providerMatchingEngine.getSettings();
    assert.strictEqual(settings.id, 'default');
    assert.strictEqual(typeof settings.offerTimeoutSeconds, 'number');
    assert.strictEqual(typeof settings.distanceWeight, 'number');
    assert.strictEqual(typeof settings.ratingWeight, 'number');
    assert.strictEqual(typeof settings.workloadWeight, 'number');
  });

  it('3. Matches eligible providers for valid service request and returns ranked candidates', async () => {
    const result = await providerMatchingEngine.matchProviders({
      serviceCategoryId: 'cat_home_services',
      serviceIds: ['srv_home_cleaning'],
      customerLocation: {
        area: 'دابوق',
        latitude: 31.9800,
        longitude: 35.8400,
        city: 'عمان',
      },
    });

    assert(result.totalEvaluatedCount > 0, 'Should evaluate existing providers');
    assert(Array.isArray(result.candidates), 'Candidates should be an array');
    if (result.topCandidate) {
      assert(result.topCandidate.score > 0, 'Candidate score should be > 0');
      assert(result.topCandidate.breakdown.totalScore > 0, 'Breakdown score should match');
      assert.strictEqual(typeof result.topCandidate.breakdown.distanceKm, 'number');
    }
  });

  it('4. Filters out providers when required capability is missing', async () => {
    const result = await providerMatchingEngine.matchProviders({
      serviceCategoryId: 'cat_home_services',
      serviceIds: ['srv_home_cleaning'],
      customerLocation: {
        area: 'خلدا',
        latitude: 31.9900,
        longitude: 35.8500,
      },
      requiredCapabilities: ['non_existent_super_robot_capability_xyz'],
    });

    assert.strictEqual(result.totalEligibleCount, 0, 'No provider should have non-existent capability');
    assert.strictEqual(result.topCandidate, null);
    assert(result.rejectionOrEscalationReason !== undefined);
  });

  it('5. Correctly excludes specified provider IDs (for retry fallback)', async () => {
    const initialResult = await providerMatchingEngine.matchProviders({
      serviceCategoryId: 'cat_home_services',
      serviceIds: ['srv_home_cleaning'],
      customerLocation: {
        area: 'الشميساني',
        latitude: 31.9680,
        longitude: 35.8900,
      },
    });

    if (initialResult.candidates.length >= 2) {
      const firstCandidateId = initialResult.candidates[0].providerId;
      const secondResult = await providerMatchingEngine.matchProviders({
        serviceCategoryId: 'cat_home_services',
        serviceIds: ['srv_cleaning_deep'],
        customerLocation: {
          area: 'الشميساني',
          latitude: 31.9680,
          longitude: 35.8900,
        },
        excludedProviderIds: [firstCandidateId],
      });

      assert(!secondResult.candidates.some((c) => c.providerId === firstCandidateId), 'Excluded candidate must not appear');
    }
  });
});

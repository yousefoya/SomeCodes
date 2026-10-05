import { db } from '../db/index.js';
import { providers, providerServices, providerCoverageAreas } from '../db/schema/providers.schema.js';
import { providerCapabilities, dispatchSettings, DispatchSetting } from '../db/schema/dispatch.schema.js';
import { serviceRequirements } from '../db/schema/services.schema.js';
import { orders } from '../db/schema/orders.schema.js';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface MatchingCriteria {
  serviceCategoryId: string;
  serviceIds: string[];
  customerLocation: {
    area: string;
    latitude: number;
    longitude: number;
    city?: string;
  };
  requiredCapabilities?: string[];
  dynamicAnswers?: Record<string, any>;
  excludedProviderIds?: string[];
  maxRadiusKm?: number;
  customWeights?: Partial<DispatchSetting>;
}

export interface CandidateScoreBreakdown {
  distanceKm: number;
  distanceScore: number;
  ratingScore: number;
  workloadScore: number;
  capabilityScore: number;
  acceptanceRateScore: number;
  totalScore: number;
  weights: {
    distance: number;
    rating: number;
    workload: number;
    capability: number;
    acceptanceRate: number;
  };
  matchedCapabilities: string[];
  missingCapabilities: string[];
  eligibilityReasons: string[];
}

export interface RankedProviderCandidate {
  providerId: string;
  nameAr: string;
  nameEn: string;
  phoneNumber: string;
  rating: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  activeOrdersCount: number;
  score: number;
  breakdown: CandidateScoreBreakdown;
  isEligible: boolean;
}

export interface MatchingResult {
  topCandidate: RankedProviderCandidate | null;
  candidates: RankedProviderCandidate[];
  totalEligibleCount: number;
  totalEvaluatedCount: number;
  settings: {
    offerTimeoutSeconds: number;
    maxRetryAttempts: number;
    maxRadiusKm: number;
  };
  rejectionOrEscalationReason?: string;
}

/**
 * Haversine formula to compute distance in kilometers between two GPS coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Intelligent Deterministic Two-Stage Provider Matching Engine
 */
export class ProviderMatchingEngine {
  /**
   * Load current dispatch settings from PostgreSQL
   */
  async getSettings(): Promise<DispatchSetting> {
    const [settings] = await db
      .select()
      .from(dispatchSettings)
      .where(eq(dispatchSettings.id, 'default'))
      .limit(1);

    if (settings) return settings;

    return {
      id: 'default',
      offerTimeoutSeconds: 90,
      maxRetryAttempts: 3,
      autoDispatchEnabled: true,
      distanceWeight: 0.30,
      ratingWeight: 0.25,
      workloadWeight: 0.20,
      capabilityWeight: 0.15,
      acceptanceRateWeight: 0.10,
      maxServiceRadiusKm: 35.0,
      updatedAt: new Date(),
    };
  }

  /**
   * Match, filter, and score providers for a given order or criteria
   */
  async matchProviders(criteria: MatchingCriteria): Promise<MatchingResult> {
    const settings = await this.getSettings();
    const maxRadius = criteria.maxRadiusKm || settings.maxServiceRadiusKm || 35.0;

    const weights = {
      distance: criteria.customWeights?.distanceWeight ?? settings.distanceWeight,
      rating: criteria.customWeights?.ratingWeight ?? settings.ratingWeight,
      workload: criteria.customWeights?.workloadWeight ?? settings.workloadWeight,
      capability: criteria.customWeights?.capabilityWeight ?? settings.capabilityWeight,
      acceptanceRate: criteria.customWeights?.acceptanceRateWeight ?? settings.acceptanceRateWeight,
    };

    // 1. Fetch all active providers in system with direct query to avoid relational stale cache
    const allProvidersList = await db
      .select()
      .from(providers)
      .where(eq(providers.isActive, true));

    const allProvServicesList = await db
      .select()
      .from(providerServices)
      .where(eq(providerServices.isAvailable, true));

    const allProvCoverageList = await db
      .select()
      .from(providerCoverageAreas);

    const provServicesMap = new Map<string, Array<typeof providerServices.$inferSelect>>();
    for (const ps of allProvServicesList) {
      if (!provServicesMap.has(ps.providerId)) {
        provServicesMap.set(ps.providerId, []);
      }
      provServicesMap.get(ps.providerId)!.push(ps);
    }

    const provCoverageMap = new Map<string, Array<typeof providerCoverageAreas.$inferSelect>>();
    for (const ca of allProvCoverageList) {
      if (!provCoverageMap.has(ca.providerId)) {
        provCoverageMap.set(ca.providerId, []);
      }
      provCoverageMap.get(ca.providerId)!.push(ca);
    }

    const allProviders = allProvidersList.map((p) => ({
      ...p,
      services: provServicesMap.get(p.id) || [],
      coverageAreas: provCoverageMap.get(p.id) || [],
    }));

    if (allProviders.length === 0) {
      return {
        topCandidate: null,
        candidates: [],
        totalEligibleCount: 0,
        totalEvaluatedCount: 0,
        settings: {
          offerTimeoutSeconds: settings.offerTimeoutSeconds,
          maxRetryAttempts: settings.maxRetryAttempts,
          maxRadiusKm: maxRadius,
        },
        rejectionOrEscalationReason: 'لا يوجد مزودي خدمة مسجلين ونشطين في النظام حالياً.',
      };
    }

    // 2. Fetch all capabilities across providers
    const allCaps = await db
      .select()
      .from(providerCapabilities)
      .where(eq(providerCapabilities.isVerified, true));

    const capsByProvider = new Map<string, Set<string>>();
    for (const cap of allCaps) {
      if (!capsByProvider.has(cap.providerId)) {
        capsByProvider.set(cap.providerId, new Set());
      }
      capsByProvider.get(cap.providerId)!.add(cap.capabilityKey);
    }

    // 3. Fetch active workload (active orders count) per provider
    const activeOrderCounts = await db
      .select({
        providerId: orders.providerId,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        inArray(orders.status, [
          'offered_to_driver',
          'assigned',
          'accepted',
          'going_to_pickup',
          'picked_up',
          'going_to_customer',
        ])
      )
      .groupBy(orders.providerId);

    const workloadMap = new Map<string, number>();
    for (const row of activeOrderCounts) {
      if (row.providerId) {
        workloadMap.set(row.providerId, row.count);
      }
    }

    // 4. Derive required capability keys
    const requiredCapKeys = new Set<string>(criteria.requiredCapabilities || []);

    // Check dynamic answers for capability triggers (e.g. Furniture Moving, Cleaning, Maintenance)
    if (criteria.dynamicAnswers) {
      const ans = criteria.dynamicAnswers;
      if (ans.truck_type === 'heavy_truck' || ans.vehicle_size === 'heavy_truck' || ans.vehicle_size === 'lorry') {
        requiredCapKeys.add('heavy_truck');
      }
      if (ans.crew_size >= 4 || ans.worker_count >= 4) {
        requiredCapKeys.add('4_worker_team');
      }
      if (ans.staff_gender === 'female' || ans.worker_gender === 'female' || ans.gender_preference === 'female') {
        requiredCapKeys.add('female_cleaning_staff');
      }
      if (ans.system_type === 'central_ac' || ans.service_type === 'hvac') {
        requiredCapKeys.add('hvac_technician');
      }
    }

    // 5. STAGE 1: HARD ELIGIBILITY FILTER
    const evaluatedCandidates: RankedProviderCandidate[] = [];
    const excludedSet = new Set(criteria.excludedProviderIds || []);

    for (const prov of allProviders) {
      // Exclude already rejected/timed-out candidates for this attempt
      if (excludedSet.has(prov.id)) {
        continue;
      }

      const eligibilityReasons: string[] = [];
      let isEligible = true;

      // Check 1: Provider must be available (online)
      if (!prov.isAvailable) {
        isEligible = false;
        eligibilityReasons.push('المزود غير متاح حالياً (أوفلاين)');
      }

      // Check 2: Service catalog compatibility
      const offersAllServices = criteria.serviceIds.every((sId) =>
        prov.services.some((ps) => ps.serviceId === sId && ps.isAvailable)
      );

      if (!offersAllServices && criteria.serviceIds.length > 0) {
        isEligible = false;
        eligibilityReasons.push('المزود لا يقدم كافة الخدمات أو المنتجات المطلوبة');
      }

      // Check 3: Distance / Area coverage
      const distanceKm = calculateHaversineDistanceKm(
        criteria.customerLocation.latitude,
        criteria.customerLocation.longitude,
        prov.latitude,
        prov.longitude
      );

      const coversAreaByName = prov.coverageAreas.some(
        (ca) =>
          ca.areaName.toLowerCase().trim() === criteria.customerLocation.area.toLowerCase().trim() ||
          ca.areaName.includes('عمان') ||
          ca.areaName.includes('كافة')
      );

      if (distanceKm > maxRadius && !coversAreaByName) {
        isEligible = false;
        eligibilityReasons.push(`المزود خارج نطاق التغطية الجغرافية (${distanceKm} كم > ${maxRadius} كم)`);
      }

      // Check 4: Workload capacity limit (max 5 active jobs by default)
      const currentActive = workloadMap.get(prov.id) || 0;
      const MAX_CONCURRENT_JOBS = 5;
      if (currentActive >= MAX_CONCURRENT_JOBS) {
        isEligible = false;
        eligibilityReasons.push(`المزود وصل للحد الأقصى من الطلبات النشطة (${currentActive}/${MAX_CONCURRENT_JOBS})`);
      }

      // Check 5: Capability requirements matching
      const provCaps = capsByProvider.get(prov.id) || new Set();
      const matchedCapabilities: string[] = [];
      const missingCapabilities: string[] = [];

      for (const capKey of requiredCapKeys) {
        if (provCaps.has(capKey)) {
          matchedCapabilities.push(capKey);
        } else {
          missingCapabilities.push(capKey);
        }
      }

      if (missingCapabilities.length > 0) {
        isEligible = false;
        eligibilityReasons.push(`المزود يفتقر إلى المتطلبات الفنية المطلوبة: ${missingCapabilities.join(', ')}`);
      }

      // STAGE 2: SOFT CONFIGURABLE SCORING (Only for eligible or ranked)
      // Distance Score (0-100): closer = higher
      const distanceScore = Math.max(0, Math.round((1 - distanceKm / maxRadius) * 100));

      // Rating Score (0-100): 5.0 rating = 100
      const ratingVal = typeof prov.rating === 'number' ? prov.rating : 5.0;
      const ratingScore = Math.min(100, Math.round((ratingVal / 5.0) * 100));

      // Workload Score (0-100): 0 active = 100, 4 active = 20
      const workloadScore = Math.max(0, 100 - currentActive * 20);

      // Capability Match Score (0-100)
      const totalReq = requiredCapKeys.size;
      const capabilityScore = totalReq === 0 ? 100 : Math.round((matchedCapabilities.length / totalReq) * 100);

      // Historical Acceptance Rate (default 95%)
      const acceptanceRateScore = 95;

      // Composite Weighted Score
      const totalScore = Math.round(
        (distanceScore * weights.distance +
          ratingScore * weights.rating +
          workloadScore * weights.workload +
          capabilityScore * weights.capability +
          acceptanceRateScore * weights.acceptanceRate) *
          10
      ) / 10;

      const breakdown: CandidateScoreBreakdown = {
        distanceKm,
        distanceScore,
        ratingScore,
        workloadScore,
        capabilityScore,
        acceptanceRateScore,
        totalScore,
        weights,
        matchedCapabilities,
        missingCapabilities,
        eligibilityReasons,
      };

      evaluatedCandidates.push({
        providerId: prov.id,
        nameAr: prov.nameAr,
        nameEn: prov.nameEn,
        phoneNumber: prov.phoneNumber,
        rating: ratingVal,
        latitude: prov.latitude,
        longitude: prov.longitude,
        distanceKm,
        activeOrdersCount: currentActive,
        score: totalScore,
        breakdown,
        isEligible,
      });
    }

    // Filter eligible candidates and sort by score descending
    const eligibleCandidates = evaluatedCandidates
      .filter((c) => c.isEligible)
      .sort((a, b) => b.score - a.score);

    const topCandidate = eligibleCandidates.length > 0 ? eligibleCandidates[0] : null;

    let rejectionOrEscalationReason: string | undefined;
    if (!topCandidate) {
      rejectionOrEscalationReason =
        evaluatedCandidates.length === 0
          ? 'لا يوجد مزودي خدمة مسجلين في المنطقة.'
          : `تعذر إيجاد مزود متاح يلبي جميع الشروط المطلوبة (${evaluatedCandidates.length} تم فحصهم).`;
    }

    return {
      topCandidate,
      candidates: eligibleCandidates,
      totalEligibleCount: eligibleCandidates.length,
      totalEvaluatedCount: evaluatedCandidates.length,
      settings: {
        offerTimeoutSeconds: settings.offerTimeoutSeconds,
        maxRetryAttempts: settings.maxRetryAttempts,
        maxRadiusKm: maxRadius,
      },
      rejectionOrEscalationReason,
    };
  }
}

export const providerMatchingEngine = new ProviderMatchingEngine();

import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { loyaltySettings, loyaltyTransactions, LoyaltySettings } from '../../db/schema/loyalty.schema.js';
import { coupons } from '../../db/schema/coupons.schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';

export const DEFAULT_LOYALTY_SETTINGS_ID = 'default_loyalty_settings';

export class LoyaltyService {
  /**
   * Fetch active loyalty settings, or seed defaults if not present
   */
  async getSettings(): Promise<LoyaltySettings> {
    let [settings] = await db
      .select()
      .from(loyaltySettings)
      .where(eq(loyaltySettings.id, DEFAULT_LOYALTY_SETTINGS_ID))
      .limit(1);

    if (!settings) {
      const [seeded] = await db
        .insert(loyaltySettings)
        .values({
          id: DEFAULT_LOYALTY_SETTINGS_ID,
          requiredPoints: 200,
          rewardType: 'coupon',
          rewardValue: '5.00',
          titleAr: 'خصم 5 د.أ مقابل 200 نقطة ولاء',
          titleEn: '5 JOD Discount for 200 Loyalty Points',
          isActive: true,
        })
        .returning();
      settings = seeded;
    }

    return settings;
  }

  /**
   * Update loyalty settings by Admin
   */
  async updateSettings(payload: {
    requiredPoints?: number;
    rewardType?: string;
    rewardValue?: number | string;
    titleAr?: string;
    titleEn?: string;
    isActive?: boolean;
  }): Promise<LoyaltySettings> {
    await this.getSettings(); // Ensure row exists

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (payload.requiredPoints !== undefined) updateData.requiredPoints = payload.requiredPoints;
    if (payload.rewardType !== undefined) updateData.rewardType = payload.rewardType;
    if (payload.rewardValue !== undefined) updateData.rewardValue = parseFloat(payload.rewardValue.toString()).toFixed(2);
    if (payload.titleAr !== undefined) updateData.titleAr = payload.titleAr.trim();
    if (payload.titleEn !== undefined) updateData.titleEn = payload.titleEn.trim();
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    const [updated] = await db
      .update(loyaltySettings)
      .set(updateData)
      .where(eq(loyaltySettings.id, DEFAULT_LOYALTY_SETTINGS_ID))
      .returning();

    return updated;
  }

  /**
   * Award +10 loyalty points upon successful order completion
   * Strictly avoids awarding duplicate points for the same order
   */
  async awardOrderCompletionPoints(orderId: string, customerId: string): Promise<{ awarded: boolean; pointsAwarded: number; newTotal: number }> {
    // Check if points for this completed order have already been awarded
    const [existing] = await db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.userId, customerId),
          eq(loyaltyTransactions.orderId, orderId),
          eq(loyaltyTransactions.type, 'order_reward')
        )
      )
      .limit(1);

    if (existing) {
      const [user] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
      return { awarded: false, pointsAwarded: 0, newTotal: user?.points ?? 0 };
    }

    // Insert loyalty transaction audit log (+10 points)
    await db.insert(loyaltyTransactions).values({
      userId: customerId,
      orderId,
      type: 'order_reward',
      points: 10,
      description: 'مكافأة إتمام الطلب بنجاح (+10 نقاط ولاء)',
    });

    // Update customer points balance in PostgreSQL
    const [updatedUser] = await db
      .update(users)
      .set({
        points: sql`${users.points} + 10`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, customerId))
      .returning();

    return {
      awarded: true,
      pointsAwarded: 10,
      newTotal: updatedUser?.points ?? 10,
    };
  }

  /**
   * Fetch customer loyalty profile, balance, eligibility, and transaction history
   */
  async getCustomerLoyalty(customerId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    if (!user) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    const settings = await this.getSettings();

    const history = await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.userId, customerId))
      .orderBy(desc(loyaltyTransactions.createdAt));

    const totalEarned = history
      .filter((t) => t.points > 0)
      .reduce((sum, t) => sum + t.points, 0);

    const isEligible = user.points >= settings.requiredPoints && settings.isActive;

    return {
      points: user.points,
      totalEarned,
      isEligibleForReward: isEligible,
      requiredPointsForReward: settings.requiredPoints,
      rewardType: settings.rewardType,
      rewardValue: parseFloat(settings.rewardValue),
      rewardTitleAr: settings.titleAr,
      rewardTitleEn: settings.titleEn,
      isRewardActive: settings.isActive,
      transactions: history.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        type: t.type,
        points: t.points,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Redeem loyalty points for an admin-configured discount coupon
   */
  async redeemReward(customerId: string): Promise<{
    message: string;
    redeemedPoints: number;
    remainingPoints: number;
    coupon: {
      code: string;
      value: number;
      minOrderValue: number;
      expiryDate: Date;
    };
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    if (!user) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    const settings = await this.getSettings();
    if (!settings.isActive) {
      throw new AppError('برنامج مكافآت الولاء متوقف مؤقتاً حالياً.', 400, 'REWARDS_INACTIVE');
    }

    if (user.points < settings.requiredPoints) {
      throw new AppError(
        `رصيد نقاط الولاء الحالي (${user.points} نقطة) غير كافٍ للاستبدال. المطلوب: ${settings.requiredPoints} نقطة.`,
        400,
        'INSUFFICIENT_LOYALTY_POINTS'
      );
    }

    const remainingPoints = user.points - settings.requiredPoints;
    const rewardVal = parseFloat(settings.rewardValue);

    // 1. Deduct points from user balance
    await db
      .update(users)
      .set({
        points: remainingPoints,
        updatedAt: new Date(),
      })
      .where(eq(users.id, customerId));

    // 2. Record redemption transaction audit log
    await db.insert(loyaltyTransactions).values({
      userId: customerId,
      type: 'redemption',
      points: -settings.requiredPoints,
      description: `استبدال ${settings.requiredPoints} نقطة بمكافأة كوبون خصم بقيمة ${rewardVal} د.أ`,
    });

    // 3. Create persistent discount coupon in PostgreSQL
    const couponCode = `LOYAL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry

    await db.insert(coupons).values({
      id: `cpn_${Date.now()}`,
      code: couponCode,
      type: 'fixed_amount',
      value: settings.rewardValue,
      minOrderValue: '0.00',
      expiryDate,
      usageLimit: 1,
      usageCount: 0,
      isActive: true,
    });

    return {
      message: `تم استبدال ${settings.requiredPoints} نقطة بنجاح والحصول على كوبون خصم بقيمة ${rewardVal} د.أ!`,
      redeemedPoints: settings.requiredPoints,
      remainingPoints,
      coupon: {
        code: couponCode,
        value: rewardVal,
        minOrderValue: 0.0,
        expiryDate,
      },
    };
  }
}

export const loyaltyService = new LoyaltyService();

import { Request, Response, NextFunction } from 'express';
import { loyaltyService } from './loyalty.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getMyLoyalty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const data = await loyaltyService.getCustomerLoyalty(userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const redeemLoyaltyReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const result = await loyaltyService.redeemReward(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getLoyaltySettingsAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await loyaltyService.getSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLoyaltySettingsAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { requiredPoints, rewardType, rewardValue, titleAr, titleEn, isActive } = req.body;

    const updated = await loyaltyService.updateSettings({
      requiredPoints: typeof requiredPoints === 'number' ? requiredPoints : undefined,
      rewardType,
      rewardValue,
      titleAr,
      titleEn,
      isActive,
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, phone, mode, name } = req.body;
    const targetPhone = phoneNumber || phone;
    if (!targetPhone) {
      throw new AppError('رقم الهاتف مطلوب.', 400, 'PHONE_REQUIRED');
    }

    const result = await authService.sendOtp(targetPhone, mode, name);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, phone, otp, code, name, mode } = req.body;
    const targetPhone = phoneNumber || phone;
    const targetCode = otp || code;

    if (!targetPhone || !targetCode) {
      throw new AppError('رقم الهاتف وكود التحقق مطلوبان.', 400, 'PHONE_AND_OTP_REQUIRED');
    }

    const result = await authService.verifyOtp(targetPhone, targetCode, name, mode);
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          walletBalance: parseFloat(result.user.walletBalance),
          points: result.user.points,
          referralCode: result.user.referralCode,
          isSuspended: result.user.isSuspended,
          createdAt: result.user.createdAt,
        },
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, phone, name } = req.body;
    const targetPhone = phoneNumber || phone;
    if (!targetPhone) {
      throw new AppError('رقم الهاتف مطلوب.', 400, 'PHONE_REQUIRED');
    }

    const result = await authService.register(targetPhone, name);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, phone } = req.body;
    const targetPhone = phoneNumber || phone;
    if (!targetPhone) {
      throw new AppError('رقم الهاتف مطلوب.', 400, 'PHONE_REQUIRED');
    }

    const result = await authService.login(targetPhone);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('رمز التجديد مطلوب.', 400, 'REFRESH_TOKEN_REQUIRED');
    }

    const tokens = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    const result = await authService.logout(refreshToken, userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول.', 401, 'AUTH_REQUIRED');
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        phoneNumber: req.user.phoneNumber,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        walletBalance: parseFloat(req.user.walletBalance),
        points: req.user.points,
        referralCode: req.user.referralCode,
        isSuspended: req.user.isSuspended,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send OTP to a new phone number to change authenticated user's phone
 */
export const sendChangePhoneOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول أولاً.', 401, 'AUTH_REQUIRED');
    }

    const { newPhone, newPhoneNumber } = req.body;
    const targetNewPhone = newPhone || newPhoneNumber;

    if (!targetNewPhone) {
      throw new AppError('رقم الهاتف الجديد مطلوب.', 400, 'NEW_PHONE_REQUIRED');
    }

    const result = await authService.sendChangePhoneOtp(req.user.id, targetNewPhone);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP on new phone and update authenticated user's phone number
 */
export const changePhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول أولاً.', 401, 'AUTH_REQUIRED');
    }

    const { newPhone, newPhoneNumber, code, otp } = req.body;
    const targetNewPhone = newPhone || newPhoneNumber;
    const targetCode = code || otp;

    if (!targetNewPhone || !targetCode) {
      throw new AppError('رقم الهاتف الجديد ورمز التحقق مطلوبان.', 400, 'NEW_PHONE_AND_CODE_REQUIRED');
    }

    const updatedUser = await authService.changePhoneNumber(req.user.id, targetNewPhone, targetCode);
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          walletBalance: parseFloat(updatedUser.walletBalance),
          points: updatedUser.points,
          referralCode: updatedUser.referralCode,
          isSuspended: updatedUser.isSuspended,
          createdAt: updatedUser.createdAt,
        },
        message: 'تم تحديث رقم الهاتف بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / deactivate authenticated user account
 */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول أولاً.', 401, 'AUTH_REQUIRED');
    }

    const result = await authService.deleteAccount(req.user.id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

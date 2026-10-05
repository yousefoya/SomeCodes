import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../../config/env.js';
import { User } from '../../../db/schema/users.schema.js';

export interface TokenPayload {
  userId: string;
  phoneNumber: string;
  role: string;
  name?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Generate Access and Refresh tokens for authenticated user
 */
export const generateTokens = (user: User): AuthTokens => {
  const payload: TokenPayload = {
    userId: user.id,
    phoneNumber: user.phoneNumber,
    role: user.role,
    name: user.name,
  };

  const accessSignOptions: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, accessSignOptions);

  // Generate cryptographically secure random refresh token
  const refreshToken = crypto.randomBytes(40).toString('hex');

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  };
};

/**
 * Verify JWT Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    if ((error as jwt.VerifyErrors).name === 'TokenExpiredError') {
      throw new Error('انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول أو تجديد الرمز.');
    }
    throw new Error('رمز المصادقة غير صالح.');
  }
};

/**
 * Create SHA-256 hash of refresh token for database persistence
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

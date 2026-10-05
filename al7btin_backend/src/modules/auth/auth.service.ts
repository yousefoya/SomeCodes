import { db } from '../../db/index.js';
import { users, authOtps, refreshTokens, User } from '../../db/schema/users.schema.js';
import { eq, and, desc, gt, ne } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { normalizeJordanianPhone } from './utils/phone.js';
import { generateTokens, hashToken, AuthTokens } from './utils/jwt.js';
import { OTPFactory } from './otp/otp.factory.js';
import { AppError } from '../../middleware/errorHandler.js';

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

// In-memory rate limiting tracker (phone -> timestamp)
const otpCooldownMap = new Map<string, number>();

const isTestEnv = (): boolean =>
  process.env.NODE_ENV === 'test' ||
  process.argv.some(arg => arg.includes('test')) ||
  env.AUTH_OTP_MODE === 'test';

export class AuthService {
  /**
   * Send an OTP code to a Jordanian phone number via Twilio Verify (or Development/Test provider)
   */
  async sendOtp(phoneNumber: string, mode?: 'login' | 'register', name?: string): Promise<{ message: string; expiresInSeconds: number; devOtp?: string }> {
    const normalizedPhone = normalizeJordanianPhone(phoneNumber);

    // 1. In Login mode: ensure account already exists before sending OTP
    if (mode === 'login') {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, normalizedPhone))
        .limit(1);

      if (!existing) {
        throw new AppError(
          'لم يتم العثور على حساب مرتبط بهذا الرقم. يرجى إنشاء حساب جديد أولاً.',
          404,
          'ACCOUNT_NOT_FOUND'
        );
      }

      if (existing.isSuspended) {
        throw new AppError('تم إيقاف هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني.', 403, 'ACCOUNT_SUSPENDED');
      }
    }

    // 2. In Register mode: ensure account does not already exist before sending OTP
    if (mode === 'register') {
      if (!name || !name.trim()) {
        throw new AppError('الاسم الكامل مطلوب لإنشاء حساب جديد.', 400, 'NAME_REQUIRED');
      }

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, normalizedPhone))
        .limit(1);

      if (existing) {
        throw new AppError('يوجد حساب مسجل مسبقاً بهذا الرقم. يرجى تسجيل الدخول.', 409, 'ACCOUNT_ALREADY_EXISTS');
      }
    }

    // 3. Rate Limiting: 30 seconds cooldown per phone number (bypassed in test environment)
    if (!isTestEnv()) {
      const lastSent = otpCooldownMap.get(normalizedPhone);
      if (lastSent && Date.now() - lastSent < 30 * 1000) {
        const waitRemaining = Math.ceil((30 * 1000 - (Date.now() - lastSent)) / 1000);
        throw new AppError(`يرجى الانتظار ${waitRemaining} ثانية قبل طلب كود تحقق جديد.`, 429, 'OTP_RATE_LIMIT');
      }
    }

    // 4. Dispatch OTP via Twilio Verify (or Dev/Test Provider)
    const provider = OTPFactory.getProvider();
    const result = await provider.sendOtp(normalizedPhone);

    otpCooldownMap.set(normalizedPhone, Date.now());

    const isDevMode =
      env.NODE_ENV !== 'production' &&
      (env.DEV_OTP_MODE === true || env.AUTH_OTP_MODE === 'development');

    return {
      message: result.message || 'تم إرسال رمز التحقق بنجاح.',
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
      ...(isDevMode && result.devOtp ? { devOtp: result.devOtp } : {}),
    };
  }

  /**
   * Verify an OTP and authenticate or register an account
   */
  async verifyOtp(phoneNumber: string, otp: string, name?: string, mode?: 'login' | 'register'): Promise<AuthResult> {
    const normalizedPhone = normalizeJordanianPhone(phoneNumber);
    const cleanOtp = otp?.trim();

    if (!cleanOtp) {
      throw new AppError('يرجى إدخال رمز التحقق.', 400, 'OTP_REQUIRED');
    }

    // Verify OTP using Twilio Verify (or Test Provider)
    const provider = OTPFactory.getProvider();
    const isValid = await provider.verifyOtp(normalizedPhone, cleanOtp);

    if (!isValid) {
      throw new AppError('رمز التحقق غير صحيح أو منتهي الصلاحية.', 400, 'INVALID_OTP');
    }

    // Query existing user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    if (!user) {
      // In Login mode or without name: DO NOT auto-create account
      if (mode === 'login' || (!mode && !name?.trim())) {
        throw new AppError(
          'لم يتم العثور على حساب مرتبط بهذا الرقم. يرجى إنشاء حساب جديد.',
          404,
          'ACCOUNT_NOT_FOUND'
        );
      }

      // In Register mode: Create customer account
      if (!name || !name.trim()) {
        throw new AppError('الاسم الكامل مطلوب لإنشاء حساب جديد.', 400, 'NAME_REQUIRED');
      }

      const [newUser] = await db
        .insert(users)
        .values({
          phoneNumber: normalizedPhone,
          name: name.trim(),
          role: 'customer',
          walletBalance: '0.00',
          points: 0,
        })
        .returning();
      user = newUser;
    } else {
      // In Register mode: Reject existing user
      if (mode === 'register') {
        throw new AppError(
          'يوجد حساب مسجل مسبقاً بهذا الرقم. يرجى تسجيل الدخول.',
          409,
          'ACCOUNT_ALREADY_EXISTS'
        );
      }

      // Check suspension
      if (user.isSuspended) {
        throw new AppError(
          'تم إيقاف هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني.',
          403,
          'ACCOUNT_SUSPENDED'
        );
      }
    }

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Save refresh token hash in database
    const tokenHash = hashToken(tokens.refreshToken);
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiry,
      isRevoked: false,
    });

    return { user, tokens };
  }

  /**
   * Register a new customer
   */
  async register(phoneNumber: string, name?: string): Promise<{ message: string; expiresInSeconds: number; devOtp?: string }> {
    return this.sendOtp(phoneNumber, 'register', name);
  }

  /**
   * Login an existing user
   */
  async login(phoneNumber: string): Promise<{ message: string; expiresInSeconds: number; devOtp?: string }> {
    return this.sendOtp(phoneNumber, 'login');
  }

  /**
   * Send OTP to a NEW phone number to initiate phone number change for an authenticated user
   */
  async sendChangePhoneOtp(userId: string, newPhoneNumber: string): Promise<{ message: string; expiresInSeconds: number; devOtp?: string }> {
    const normalizedNewPhone = normalizeJordanianPhone(newPhoneNumber);

    // Verify authenticated user exists
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    if (currentUser.phoneNumber === normalizedNewPhone) {
      throw new AppError('رقم الهاتف الجديد يطابق رقم هاتفك الحالي.', 400, 'SAME_PHONE_NUMBER');
    }

    // Check if new phone is already registered to ANOTHER user
    const [alreadyInUse] = await db
      .select()
      .from(users)
      .where(and(eq(users.phoneNumber, normalizedNewPhone), ne(users.id, userId)))
      .limit(1);

    if (alreadyInUse) {
      throw new AppError('رقم الهاتف الجديد مستخدم بالفعل لحساب آخر.', 409, 'PHONE_ALREADY_IN_USE');
    }

    // Dispatch OTP to the new phone number via Twilio Verify (or Dev/Test Provider)
    const provider = OTPFactory.getProvider();
    const result = await provider.sendOtp(normalizedNewPhone);

    const isDevMode =
      env.NODE_ENV !== 'production' &&
      (env.DEV_OTP_MODE === true || env.AUTH_OTP_MODE === 'development');

    return {
      message: result.message || 'تم إرسال رمز التحقق إلى الرقم الجديد بنجاح.',
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
      ...(isDevMode && result.devOtp ? { devOtp: result.devOtp } : {}),
    };
  }

  /**
   * Verify OTP and change phone number for authenticated user
   */
  async changePhoneNumber(userId: string, newPhoneNumber: string, code: string): Promise<User> {
    const normalizedNewPhone = normalizeJordanianPhone(newPhoneNumber);
    const cleanCode = code?.trim();

    if (!cleanCode) {
      throw new AppError('يرجى إدخال رمز التحقق.', 400, 'OTP_REQUIRED');
    }

    // 1. Verify OTP with Twilio Verify on the new phone number
    const provider = OTPFactory.getProvider();
    const isValid = await provider.verifyOtp(normalizedNewPhone, cleanCode);

    if (!isValid) {
      throw new AppError('رمز التحقق غير صحيح أو منتهي الصلاحية.', 400, 'INVALID_OTP');
    }

    // 2. Check uniqueness again before DB write
    const [alreadyInUse] = await db
      .select()
      .from(users)
      .where(and(eq(users.phoneNumber, normalizedNewPhone), ne(users.id, userId)))
      .limit(1);

    if (alreadyInUse) {
      throw new AppError('رقم الهاتف الجديد مستخدم بالفعل لحساب آخر.', 409, 'PHONE_ALREADY_IN_USE');
    }

    // 3. Update the user's phone number, keeping all existing orders, wallet balance, and ID intact
    const [updatedUser] = await db
      .update(users)
      .set({
        phoneNumber: normalizedNewPhone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new AppError('فشل تحديث رقم الهاتف للمستخدم.', 404, 'USER_NOT_FOUND');
    }

    return updatedUser;
  }

  /**
   * Soft-delete / deactivate authenticated user account
   */
  async deleteAccount(userId: string): Promise<{ message: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    // Soft-delete to preserve foreign keys and financial history
    await db
      .update(users)
      .set({
        isSuspended: true,
        name: 'حساب محذوف',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Revoke all active sessions
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));

    return { message: 'تم حذف الحساب بنجاح وإلغاء الجلسات النشطة.' };
  }

  /**
   * Refresh expired access token using valid refresh token
   */
  async refreshAccessToken(rawRefreshToken: string): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw new AppError('رمز التجديد مطلوب.', 400, 'REFRESH_TOKEN_REQUIRED');
    }

    const hashedToken = hashToken(rawRefreshToken);

    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, hashedToken), eq(refreshTokens.isRevoked, false)))
      .limit(1);

    if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
      throw new AppError('رمز التجديد غير صالح أو منتهي الصلاحية.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!user || user.isSuspended) {
      throw new AppError('المستخدم غير موجود أو موقوف.', 403, 'ACCOUNT_SUSPENDED');
    }

    // Revoke old refresh token (Token Rotation)
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // Generate new token pair
    const newTokens = generateTokens(user);
    const newTokenHash = hashToken(newTokens.refreshToken);
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: newExpiry,
      isRevoked: false,
    });

    return newTokens;
  }

  /**
   * Logout and revoke refresh token
   */
  async logout(rawRefreshToken?: string, userId?: string): Promise<{ message: string }> {
    if (rawRefreshToken) {
      const hashedToken = hashToken(rawRefreshToken);
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.tokenHash, hashedToken));
    } else if (userId) {
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.userId, userId));
    }

    return { message: 'تم تسجيل الخروج بنجاح.' };
  }

  /**
   * Get authenticated user profile
   */
  async getMe(userId: string): Promise<User> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    if (user.isSuspended) {
      throw new AppError('تم إيقاف هذا الحساب.', 403, 'ACCOUNT_SUSPENDED');
    }

    return user;
  }
}

export const authService = new AuthService();

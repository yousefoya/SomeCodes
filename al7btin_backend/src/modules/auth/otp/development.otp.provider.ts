import { IOTPProvider } from './otp.interface.js';
import { env } from '../../../config/env.js';

interface DevOtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * In-memory Development OTP Provider
 * Used ONLY when DEV_OTP_MODE=true in non-production environments to allow MVP testing without live SMS gateway.
 * Generates random 6-digit OTPs and returns them in the API response.
 */
export class DevelopmentOTPProvider implements IOTPProvider {
  private static store = new Map<string, DevOtpRecord>();

  /**
   * Generates a random 6-digit OTP, stores it with expiry, and logs it to console.
   */
  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string; devOtp: string }> {
    const cleanPhone = phoneNumber.trim();
    
    // Generate a random 6-digit numeric OTP (100000 - 999999)
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMs = (env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000;
    const expiresAt = Date.now() + expiryMs;

    DevelopmentOTPProvider.store.set(cleanPhone, {
      code: randomOtp,
      expiresAt,
      attempts: 0,
    });

    console.log(`
    ===================================================
    📱 [DEVELOPMENT OTP MODE]
    📞 Phone: ${cleanPhone}
    🔑 Generated OTP: ${randomOtp}
    ⏳ Expires in: ${env.OTP_EXPIRY_MINUTES || 5} minutes
    ⚠️ (Local Demo Mode active - code returned in dev response)
    ===================================================
    `);

    return {
      success: true,
      message: 'تم إرسال رمز التحقق التجريبي بنجاح.',
      devOtp: randomOtp,
    };
  }

  /**
   * Verifies the entered OTP against stored development OTP.
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const cleanPhone = phoneNumber.trim();
    const cleanCode = code?.trim();

    if (!cleanCode) return false;

    const record = DevelopmentOTPProvider.store.get(cleanPhone);
    if (!record) {
      return false;
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      DevelopmentOTPProvider.store.delete(cleanPhone);
      return false;
    }

    // Check max attempts
    if (record.attempts >= (env.OTP_MAX_ATTEMPTS || 5)) {
      DevelopmentOTPProvider.store.delete(cleanPhone);
      return false;
    }

    // Compare code
    if (record.code === cleanCode) {
      // Consume OTP on successful verification
      DevelopmentOTPProvider.store.delete(cleanPhone);
      return true;
    }

    // Increment failed attempt counter
    record.attempts += 1;
    return false;
  }

  /**
   * Clear in-memory OTP store (useful for resets)
   */
  public static clear(): void {
    this.store.clear();
  }
}


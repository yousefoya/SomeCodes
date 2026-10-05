import { env } from '../../../config/env.js';
import { IOTPProvider } from './otp.interface.js';
import { toE164JordanianPhone } from '../utils/phone.js';
import { AppError } from '../../../middleware/errorHandler.js';

/**
 * Official Twilio Verify API v2 Production Provider
 * Uses Twilio Verify REST API to send and verify SMS one-time passwords without storing plain OTPs.
 */
export class TwilioOTPProvider implements IOTPProvider {
  private getCredentials() {
    const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = env.TWILIO_AUTH_TOKEN?.trim();
    const serviceSid = env.TWILIO_VERIFY_SERVICE_SID?.trim();

    if (!accountSid || !authToken || !serviceSid) {
      throw new AppError(
        'Twilio Verify credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID) are not configured on the server.',
        500,
        'TWILIO_NOT_CONFIGURED'
      );
    }

    return { accountSid, authToken, serviceSid };
  }

  private getAuthHeader(accountSid: string, authToken: string): string {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Dispatches a real SMS verification code via Twilio Verify v2
   */
  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    const { accountSid, authToken, serviceSid } = this.getCredentials();
    const e164Phone = toE164JordanianPhone(phoneNumber);

    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
    const bodyParams = new URLSearchParams();
    bodyParams.append('To', e164Phone);
    bodyParams.append('Channel', 'sms');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(accountSid, authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        if (response.status === 429 || data?.code === 60203) {
          throw new AppError('تم تجاوز حد إرسال الرسائل القصيرة. يرجى الانتظار والمحاولة لاحقاً.', 429, 'OTP_RATE_LIMIT');
        }
        if (response.status === 400 || data?.code === 60200) {
          throw new AppError('رقم الهاتف غير صالح للإرسال عبر خدمة SMS.', 400, 'INVALID_PHONE');
        }
        throw new AppError(`فشل إرسال كود التحقق عبر Twilio (${data?.message || response.statusText})`, 502, 'OTP_SEND_FAILED');
      }

      return {
        success: true,
        message: 'تم إرسال رمز التحقق عبر الرسائل القصيرة (SMS) بنجاح.',
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`تعذر الاتصال بمزود خدمة الرسائل Twilio: ${error.message}`, 502, 'OTP_GATEWAY_ERROR');
    }
  }

  /**
   * Verifies the user-entered code against Twilio Verify v2
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const { accountSid, authToken, serviceSid } = this.getCredentials();
    const e164Phone = toE164JordanianPhone(phoneNumber);
    const cleanCode = code.trim();

    if (!cleanCode) {
      return false;
    }

    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
    const bodyParams = new URLSearchParams();
    bodyParams.append('To', e164Phone);
    bodyParams.append('Code', cleanCode);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(accountSid, authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        if (response.status === 404 || data?.code === 20404) {
          // Verification expired or not found
          return false;
        }
        if (response.status === 429 || data?.code === 60202) {
          throw new AppError('تجاوزت الحد الأقصى للمحاولات الخاطئة. يرجى طلب رمز جديد.', 400, 'OTP_MAX_ATTEMPTS');
        }
        return false;
      }

      return data?.status === 'approved';
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`تعذر التحقق من الرمز عبر Twilio: ${error.message}`, 502, 'OTP_GATEWAY_ERROR');
    }
  }
}

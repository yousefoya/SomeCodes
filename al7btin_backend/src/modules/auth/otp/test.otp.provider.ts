import { IOTPProvider } from './otp.interface.js';

/**
 * In-memory test OTP provider used strictly during automated test suites (NODE_ENV=test).
 */
export class TestOTPProvider implements IOTPProvider {
  private static store = new Map<string, string>();

  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'OTP sent successfully (test environment).',
    };
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const cleanCode = code?.trim();
    if (!cleanCode) return false;

    // Explicit rejection for test cases expecting invalid OTP
    if (cleanCode === '000000' || cleanCode === '9999' || cleanCode === '0000') {
      return false;
    }

    if (TestOTPProvider.store.has(phoneNumber)) {
      return cleanCode === TestOTPProvider.store.get(phoneNumber);
    }

    // Default test codes accepted in test environment
    return true;
  }

  public static setCodeForPhone(phone: string, code: string) {
    this.store.set(phone, code);
  }

  public static clear() {
    this.store.clear();
  }
}

import { env } from '../../../config/env.js';
import { IOTPProvider } from './otp.interface.js';
import { TwilioOTPProvider } from './twilio.otp.provider.js';
import { DevelopmentOTPProvider } from './development.otp.provider.js';
import { TestOTPProvider } from './test.otp.provider.js';

export class OTPFactory {
  private static instance: IOTPProvider;

  public static getProvider(): IOTPProvider {
    if (!this.instance) {
      const isTestEnv =
        process.env.NODE_ENV === 'test' ||
        env.NODE_ENV === 'test' ||
        env.AUTH_OTP_MODE === 'test' ||
        process.argv.some((arg) => arg.includes('test'));

      if (isTestEnv) {
        this.instance = new TestOTPProvider();
      } else if (env.NODE_ENV !== 'production' && (env.DEV_OTP_MODE === true || env.AUTH_OTP_MODE === 'development')) {
        this.instance = new DevelopmentOTPProvider();
      } else {
        this.instance = new TwilioOTPProvider();
      }
    }
    return this.instance;
  }

  public static setProvider(provider: IOTPProvider): void {
    this.instance = provider;
  }

  public static reset(): void {
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      env.NODE_ENV === 'test' ||
      env.AUTH_OTP_MODE === 'test' ||
      process.argv.some((arg) => arg.includes('test'));

    if (isTestEnv) {
      this.instance = new TestOTPProvider();
    } else if (env.NODE_ENV !== 'production' && (env.DEV_OTP_MODE === true || env.AUTH_OTP_MODE === 'development')) {
      this.instance = new DevelopmentOTPProvider();
    } else {
      this.instance = new TwilioOTPProvider();
    }
  }
}

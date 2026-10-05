import { IOTPProvider } from './otp.interface.js';

export class ProductionOTPProvider implements IOTPProvider {
  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    throw new Error('Production SMS Provider is not yet configured with SMS Gateway credentials.');
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    throw new Error('Production SMS Provider is not yet configured with SMS Gateway credentials.');
  }
}

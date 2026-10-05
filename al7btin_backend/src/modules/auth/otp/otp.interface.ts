export interface IOTPProvider {
  /**
   * Dispatch an OTP verification to a phone number
   * @param phoneNumber Normalized local Jordanian phone number (07XXXXXXXX)
   */
  sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string; devOtp?: string }>;

  /**
   * Check whether the entered code is valid for the phone number
   * @param phoneNumber Normalized local Jordanian phone number (07XXXXXXXX)
   * @param code The numeric OTP code entered by the user
   */
  verifyOtp(phoneNumber: string, code: string): Promise<boolean>;
}


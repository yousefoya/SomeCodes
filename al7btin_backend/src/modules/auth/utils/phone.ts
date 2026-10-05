/**
 * Normalize and validate Jordanian phone numbers.
 * Converts any valid variant (+96279..., 0096279..., 79..., 079...) to standard local '07XXXXXXXX' format.
 */
export const normalizeJordanianPhone = (phone: string): string => {
  if (!phone) return '';

  // Remove spaces, hyphens, parentheses, and plus sign
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  // Remove leading zeros or country codes (00962 or 962)
  if (cleaned.startsWith('00962')) {
    cleaned = cleaned.substring(5);
  } else if (cleaned.startsWith('962')) {
    cleaned = cleaned.substring(3);
  }

  // If starts with single 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Prepend local leading 0
  const normalized = `0${cleaned}`;

  // Validate format: 07 followed by 7, 8, or 9, followed by 7 digits (Total: 10 digits)
  const jordanianMobileRegex = /^07[789]\d{7}$/;
  if (!jordanianMobileRegex.test(normalized)) {
    throw new Error('رقم الهاتف غير صالح. يرجى إدخال رقم هاتف أردني صحيح (مثل: 0791234567).');
  }

  return normalized;
};

/**
 * Convert any valid Jordanian phone number to strict E.164 format for Twilio Verify.
 * E.g. 0791234567 -> +962791234567
 */
export const toE164JordanianPhone = (phone: string): string => {
  const local = normalizeJordanianPhone(phone);
  // local is 07XXXXXXXX -> remove leading 0 and prepend +962
  return `+962${local.substring(1)}`;
};

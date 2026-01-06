/**
 * Phone utility functions
 */

/**
 * Normalize phone number to E.164 format (+XX...)
 * Supports formats: +84..., 84..., 0...
 *
 * @param phone - Phone number in various formats
 * @returns Normalized phone number in E.164 format or null if invalid
 *
 * @example
 * normalizePhone('0123456789') => '+84123456789'
 * normalizePhone('84123456789') => '+84123456789'
 * normalizePhone('+84123456789') => '+84123456789'
 * normalizePhone(null) => null
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 0, replace with country code (default: +84 for Vietnam)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    return `+84${cleaned}`;
  }

  // If starts with country code without +, add +
  if (cleaned.startsWith('84')) {
    return `+${cleaned}`;
  }

  // If starts with country code (other), add +
  // Default: assume it's a valid country code
  return `+${cleaned}`;
}

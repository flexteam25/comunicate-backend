/**
 * Phone utility functions
 */

/**
 * Normalize phone number to E.164 format (+XX...)
 * Supports international formats: +XX..., XX... (with country code)
 *
 * @param phone - Phone number in various formats
 * @returns Normalized phone number in E.164 format or null if invalid
 *
 * @example
 * normalizePhone('+84123456789') => '+84123456789'
 * normalizePhone('+1234567890') => '+1234567890'
 * normalizePhone('84123456789') => '+84123456789'
 * normalizePhone('1234567890') => '+1234567890'
 * normalizePhone('0123456789') => null (local format without country code - invalid)
 * normalizePhone(null) => null
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep it (already in E.164 format)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 0, it's likely a local format without country code
  // Require user to provide full international format (with country code)
  if (cleaned.startsWith('0')) {
    return null; // Invalid: local format without country code
  }

  // If starts with country code (1-9), add +
  // This supports international numbers without + prefix
  // E.g., "84123456789" => "+84123456789", "1234567890" => "+1234567890"
  if (/^[1-9]\d/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Invalid format
  return null;
}

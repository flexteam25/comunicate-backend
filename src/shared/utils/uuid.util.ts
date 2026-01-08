/**
 * UUID v4 regex pattern
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID v4 format
 * @param value - String to check
 * @returns true if the string is a valid UUID v4, false otherwise
 */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

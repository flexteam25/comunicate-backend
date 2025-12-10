/**
 * String utility functions
 */

/**
 * Convert string to snake_case
 * Breaks whitespace and converts to lowercase with underscores
 * 
 * Examples:
 * - "User Beta 1" → "user_beta_1"
 * - "user_beta_1" → "user_beta_1"
 * - "UserGamma1" → "usergamma1"
 * - "User Gamma 1" → "user_gamma_1"
 */
export function toSnakeCase(str: string): string {
  if (!str) {
    return str;
  }

  return str
    .trim()
    .split(/\s+/) // Split by whitespace
    .map((word) => word.toLowerCase())
    .join('_');
}


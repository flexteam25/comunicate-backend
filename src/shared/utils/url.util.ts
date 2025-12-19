/**
 * URL utility functions
 */

/**
 * Build full URL by combining base URL with relative path
 * @param baseUrl - Base URL (e.g., http://localhost:3008)
 * @param relativePath - Relative path (e.g., /uploads/avatars/user/file.webp)
 * @returns Full URL or null if relativePath is null/undefined
 */
export function buildFullUrl(
  baseUrl: string | undefined,
  relativePath: string | null | undefined,
): string | null {
  if (!relativePath) {
    return null;
  }

  if (!baseUrl) {
    return relativePath;
  }

  // Remove trailing slash from baseUrl and leading slash from relativePath
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  return `${cleanBaseUrl}${cleanPath}`;
}

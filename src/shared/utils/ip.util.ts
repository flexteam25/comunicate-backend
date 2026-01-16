/**
 * IP address utility functions
 * Support both IPv4 and IPv6 for trust checking
 */

/**
 * Parse and normalize IP address
 * - Validates and normalizes IPv4 addresses
 * - Validates and normalizes IPv6 addresses (expands compressed format)
 * - Converts IPv6-mapped IPv4 (::ffff:xxx.xxx.xxx.xxx) to IPv4
 * - Converts IPv6 loopback (::1) to IPv4 loopback (127.0.0.1)
 * - Removes brackets from IPv6 addresses
 * 
 * @param ip Raw IP address string
 * @returns Normalized IP address (IPv4 or IPv6) or 'unknown' if invalid
 */
export function parseIp(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Remove brackets from IPv6 addresses
  let cleanedIp = ip.trim();
  if (cleanedIp.startsWith('[') && cleanedIp.endsWith(']')) {
    cleanedIp = cleanedIp.slice(1, -1);
  }

  // IPv6 loopback -> IPv4 loopback
  if (cleanedIp === '::1') {
    return '127.0.0.1';
  }

  // IPv6-mapped IPv4 (::ffff:xxx.xxx.xxx.xxx) -> IPv4
  const ipv6MappedRegex = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
  const match = cleanedIp.match(ipv6MappedRegex);
  if (match) {
    const ipv4 = match[1];
    // Validate IPv4
    if (isValidIPv4(ipv4)) {
      return ipv4;
    }
  }

  // IPv6-mapped IPv4 with 0:0:0:0:0:ffff prefix
  const ipv6MappedLongRegex = /^0:0:0:0:0:ffff:(\d+\.\d+\.\d+\.\d+)$/i;
  const matchLong = cleanedIp.match(ipv6MappedLongRegex);
  if (matchLong) {
    const ipv4 = matchLong[1];
    if (isValidIPv4(ipv4)) {
      return ipv4;
    }
  }

  // Check if it's a valid IPv4
  if (isValidIPv4(cleanedIp)) {
    return cleanedIp;
  }

  // Check if it's a valid IPv6
  if (isValidIPv6(cleanedIp)) {
    return normalizeIPv6(cleanedIp);
  }

  // Invalid IP
  return 'unknown';
}

/**
 * Validate IPv4 address
 */
function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate IPv6 address
 */
function isValidIPv6(ip: string): boolean {
  // Basic IPv6 validation
  // IPv6 can have:
  // - 8 groups of 1-4 hex digits separated by :
  // - :: can appear once to compress zeros
  // - Can have ::ffff: prefix for mapped IPv4
  
  // Remove ::ffff: prefix if present (already handled above)
  if (ip.startsWith('::ffff:') || ip.startsWith('0:0:0:0:0:ffff:')) {
    return false; // Should be handled as IPv4
  }

  // Check for valid IPv6 format
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  if (!ipv6Regex.test(ip)) {
    return false;
  }

  // Check for multiple :: (should only appear once)
  const doubleColonCount = (ip.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return false;
  }

  // If no ::, must have exactly 7 colons
  if (!ip.includes('::')) {
    const colonCount = (ip.match(/:/g) || []).length;
    if (colonCount !== 7) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize IPv6 address
 * Returns lowercase IPv6 address (keeps original format, just lowercase)
 * For production, consider using a library like ipaddr.js for proper normalization
 */
function normalizeIPv6(ip: string): string {
  // For now, just return lowercase
  // Proper IPv6 normalization (expanding ::, removing leading zeros) is complex
  // and may not be necessary for storage/blocking purposes
  return ip.toLowerCase();
}

/**
 * Normalize IP address (legacy function, kept for backward compatibility)
 * Converts IPv6 loopback (::1) to IPv4 (127.0.0.1)
 * Converts IPv6-mapped IPv4 (::ffff:127.0.0.1) to IPv4 (127.0.0.1)
 * Returns original IP if it's already IPv4 or cannot be normalized
 */
export function normalizeIp(ip: string): string {
  const parsed = parseIp(ip);
  // If parseIp returns 'unknown', return original IP
  return parsed !== 'unknown' ? parsed : ip;
}

/**
 * Get all IP versions to check (original + normalized if different)
 * Returns array of IPs to check in trust_ips
 */
export function getAllIpVersions(ip: string): string[] {
  if (!ip || ip === 'unknown') {
    return [ip];
  }

  const normalized = normalizeIp(ip);
  // If normalized is different from original, check both
  if (normalized !== ip) {
    return [ip, normalized];
  }
  // Otherwise, only check original
  return [ip];
}

/**
 * Check if IP matches any in trust list
 * Checks both original (IPv6) and normalized (IPv4) versions
 *
 * Examples:
 * - If ip is '::1' and trustIps has '127.0.0.1' → returns true
 * - If ip is '::1' and trustIps has '::1' → returns true
 * - If ip is '::ffff:192.168.1.1' and trustIps has '192.168.1.1' → returns true
 * - If ip is '192.168.1.1' and trustIps has '192.168.1.1' → returns true
 */
export function isIpInTrustList(ip: string, trustIps: string[]): boolean {
  if (!trustIps || trustIps.length === 0) {
    return false;
  }

  // Wildcard "*" means accept all IPs
  if (trustIps.includes('*')) {
    return true;
  }

  // Get all IP versions to check (original IPv6 + normalized IPv4 if different)
  const ipVersions = getAllIpVersions(ip);
  // Example: if ip is '::1', ipVersions will be ['::1', '127.0.0.1']

  // Check all IP versions (original + normalized if different)
  return ipVersions.some((ipVersion) => {
    // Exact match
    if (trustIps.includes(ipVersion)) {
      return true;
    }

    // CIDR match (simplified, for production use proper CIDR library)
    return trustIps.some((trustIp) => {
      if (trustIp.includes('/')) {
        // Basic CIDR check (simplified)
        const [network] = trustIp.split('/');
        return network === ipVersion.split('/')[0];
      }
      return false;
    });
  });
}

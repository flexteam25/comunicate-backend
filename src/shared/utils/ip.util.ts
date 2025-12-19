/**
 * IP address utility functions
 * Support both IPv4 and IPv6 for trust checking
 */

/**
 * Normalize IP address
 * Converts IPv6 loopback (::1) to IPv4 (127.0.0.1)
 * Converts IPv6-mapped IPv4 (::ffff:127.0.0.1) to IPv4 (127.0.0.1)
 * Returns original IP if it's already IPv4 or cannot be normalized
 */
export function normalizeIp(ip: string): string {
  if (!ip || ip === 'unknown') {
    return ip;
  }

  // IPv6 loopback -> IPv4 loopback
  if (ip === '::1') {
    return '127.0.0.1';
  }

  // IPv6-mapped IPv4 (::ffff:xxx.xxx.xxx.xxx) -> IPv4
  const ipv6MappedRegex = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
  const match = ip.match(ipv6MappedRegex);
  if (match) {
    return match[1];
  }

  // IPv6-mapped IPv4 with brackets [::ffff:xxx.xxx.xxx.xxx] -> IPv4
  const ipv6MappedBracketsRegex = /^\[::ffff:(\d+\.\d+\.\d+\.\d+)\]$/i;
  const matchBrackets = ip.match(ipv6MappedBracketsRegex);
  if (matchBrackets) {
    return matchBrackets[1];
  }

  // Return original IP if it's already IPv4 or cannot be normalized
  return ip;
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

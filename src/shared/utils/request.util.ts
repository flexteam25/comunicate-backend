import { Request } from 'express';
import { parseIp } from './ip.util';

/**
 * Get client IP address from request
 * Handles various proxy headers and fallback options
 *
 * Priority:
 * 1. x-forwarded-for (first IP in chain)
 * 2. x-real-ip
 * 3. req.ip (Express trust proxy)
 * 4. req.socket.remoteAddress
 * 5. 'unknown' as fallback
 *
 * @param req Express Request object
 * @returns Parsed and normalized IP address (IPv4 or IPv6, max 45 chars)
 */
export function getClientIp(req: Request): string {
  const rawIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  // Parse and normalize IP (handles IPv4/IPv6 conversion)
  return parseIp(rawIp) as string;
}

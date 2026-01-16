import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { getClientIp } from '../utils/request.util';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    tokenId: string;
  };
}

/**
 * IP Tracking Middleware
 *
 * 1. Check if IP is blocked (from cache, fallback to DB if cache miss)
 * 2. Track user IPs in Redis (async, non-blocking)
 * 3. Cache blocked IPs for 30 minutes
 */
@Injectable()
export class IpTrackingMiddleware implements NestMiddleware {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    const userId = req.user?.userId;

    // Skip tracking for certain paths
    if (this.shouldSkipTracking(req.path)) {
      return next();
    }

    // Skip if IP is unknown or invalid
    if (!ip || ip === 'unknown') {
      return next();
    }

    // Skip global IP blocking for admin routes
    // Admin IP blocking will be handled separately in a guard/interceptor after admin authentication
    const isAdminRoute = req.path.startsWith('/admin/');

    try {
      // 1. Check global IP blocking (only for non-admin routes)
      if (!isAdminRoute) {
        const isGloballyBlocked = await this.checkGlobalBlockedIp(ip);
        if (isGloballyBlocked) {
          this.logger.warn(
            'Blocked IP attempt (global)',
            { ip, userId, path: req.path },
            'ip-tracking',
          );
          throw new HttpException(
            {
              statusCode: HttpStatus.FORBIDDEN,
              message: 'Access denied',
            },
            HttpStatus.FORBIDDEN,
          );
        }
      }

      // 2. Track IP in Redis (async, non-blocking)
      // Note: userId might not be available yet if middleware runs before JWT guard
      // We'll track IP after authentication in an interceptor or controller
      // But we can still track here if userId is available
      if (userId) {
        // Don't await - let it run in background
        this.trackUserIp(userId, ip).catch((err: unknown) => {
          const errorMessage =
            err instanceof Error
              ? err.message
              : err != null
                ? JSON.stringify(err)
                : 'Unknown error';
          this.logger.error(
            'Failed to track user IP',
            { userId, ip, error: errorMessage },
            'ip-tracking',
          );
        });
      } else {
        // Store IP in request for later tracking after authentication
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (req as any).clientIp = ip;
      }
    } catch (err: unknown) {
      // Re-throw HttpException (blocked IP)
      if (err instanceof HttpException) {
        throw err;
      }
      // Log other errors but don't block request
      const errorMessage =
        err instanceof Error
          ? err.message
          : err != null
            ? JSON.stringify(err)
            : 'Unknown error';
      this.logger.error(
        'IP tracking error',
        { ip, userId, error: errorMessage },
        'ip-tracking',
      );
    }

    next();
  }

  /**
   * Check if IP is globally blocked
   * Only checks global blocked IPs cache (lightweight check)
   * User-specific blocking is handled in interceptor after authentication
   * Admin IP blocking will be handled in a separate guard/interceptor
   */
  private async checkGlobalBlockedIp(ip: string): Promise<boolean> {
    try {
      const globalBlockedIps: string[] | null =
        await this.redisService.getGlobalBlockedIps();
      if (globalBlockedIps !== null && Array.isArray(globalBlockedIps)) {
        return globalBlockedIps.includes(ip);
      }
    } catch {
      // Ignore cache errors - fail open
    }

    // Cache miss - assume not blocked
    // The scheduler will populate cache from DB
    return false;
  }

  /**
   * Track user IP in Redis (async, non-blocking)
   */
  private async trackUserIp(userId: string, ip: string): Promise<void> {
    try {
      await this.redisService.addUserIp(userId, ip, 3600); // 1 hour TTL
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : err != null
            ? JSON.stringify(err)
            : 'Unknown error';
      this.logger.error(
        'Failed to add user IP to Redis',
        { userId, ip, error: errorMessage },
        'ip-tracking',
      );
    }
  }

  /**
   * Check if path should skip tracking
   */
  private shouldSkipTracking(path: string): boolean {
    const skipPaths = ['/health', '/metrics', '/favicon.ico'];
    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }
}

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

    try {
      // 1. Check if IP is blocked (from cache)
      const isBlocked = await this.checkBlockedIp(ip);
      if (isBlocked) {
        this.logger.warn(
          'Blocked IP attempt',
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
   * Check if IP is blocked
   * 1. Check cache first
   * 2. If cache miss, assume not blocked (scheduler will populate cache)
   */
  private async checkBlockedIp(ip: string): Promise<boolean> {
    // Check global blocked IPs cache
    try {
      const blockedIpsResult: string[] | null = await this.redisService.getBlockedIps();
      if (blockedIpsResult !== null && Array.isArray(blockedIpsResult)) {
        // Cache hit
        return blockedIpsResult.includes(ip);
      }
    } catch {
      // Ignore cache errors
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

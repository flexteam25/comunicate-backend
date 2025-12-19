import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

/**
 * API Throttle Middleware
 *
 * Separate rate limits for GET and POST methods:
 * - GET methods: Higher limit (for read operations)
 * - POST methods: Lower limit (for write operations)
 */
@Injectable()
export class ApiThrottleMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  // Rate limit stores: IP -> { count, resetTime, method }
  private readonly rateLimitStore = new Map<
    string,
    { getCount: number; postCount: number; resetTime: number }
  >();

  // Configuration
  private readonly GET_LIMIT = parseInt(process.env.API_THROTTLE_GET_LIMIT || '100', 10); // requests
  private readonly GET_WINDOW =
    parseInt(process.env.API_THROTTLE_GET_WINDOW || '60', 10) * 1000; // milliseconds
  private readonly POST_LIMIT = parseInt(process.env.API_THROTTLE_POST_LIMIT || '30', 10); // requests
  private readonly POST_WINDOW =
    parseInt(process.env.API_THROTTLE_POST_WINDOW || '60', 10) * 1000; // milliseconds

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const method = req.method.toUpperCase();

    // Skip throttle for certain paths (e.g., health checks, metrics)
    if (this.shouldSkipThrottle(req.path)) {
      return next();
    }

    // Get or create rate limit entry
    const now = Date.now();
    let entry = this.rateLimitStore.get(ip);

    if (!entry || entry.resetTime < now) {
      // Reset or create entry
      entry = {
        getCount: 0,
        postCount: 0,
        resetTime: now + (method === 'GET' ? this.GET_WINDOW : this.POST_WINDOW),
      };
      this.rateLimitStore.set(ip, entry);
    }

    // Check limit based on method
    if (method === 'GET') {
      entry.getCount++;
      if (entry.getCount > this.GET_LIMIT) {
        this.logger.warn(
          'GET rate limit exceeded',
          { ip, path: req.path, count: entry.getCount },
          'throttle',
        );
        res.setHeader('X-RateLimit-Limit', this.GET_LIMIT.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'GET rate limit exceeded',
            retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      res.setHeader('X-RateLimit-Limit', this.GET_LIMIT.toString());
      res.setHeader(
        'X-RateLimit-Remaining',
        (this.GET_LIMIT - entry.getCount).toString(),
      );
    } else if (
      method === 'POST' ||
      method === 'PUT' ||
      method === 'PATCH' ||
      method === 'DELETE'
    ) {
      entry.postCount++;
      if (entry.postCount > this.POST_LIMIT) {
        this.logger.warn(
          'POST rate limit exceeded',
          { ip, path: req.path, method, count: entry.postCount },
          'throttle',
        );
        res.setHeader('X-RateLimit-Limit', this.POST_LIMIT.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'POST rate limit exceeded',
            retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      res.setHeader('X-RateLimit-Limit', this.POST_LIMIT.toString());
      res.setHeader(
        'X-RateLimit-Remaining',
        (this.POST_LIMIT - entry.postCount).toString(),
      );
    }

    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    next();
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Check if path should skip throttle
   */
  private shouldSkipThrottle(path: string): boolean {
    const skipPaths = ['/health', '/metrics', '/favicon.ico'];
    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }

  /**
   * Cleanup old entries periodically
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        this.rateLimitStore.delete(ip);
      }
    }
  }
}

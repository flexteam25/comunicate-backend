import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { getClientIp } from '../utils/request.util';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    tokenId: string;
  };
  clientIp?: string;
}

/**
 * IP Tracking Interceptor
 *
 * Runs AFTER guards, so req.user is available
 * Tracks user IPs in Redis (async, non-blocking)
 */
@Injectable()
export class IpTrackingInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.userId;
    const ip = request.clientIp || getClientIp(request);
    const path = request.path;

    // Check user-specific IP blocking if user is authenticated
    // This runs AFTER JWT guard, so req.user is available
    if (userId && ip && ip !== 'unknown') {
      return this.checkUserSpecificBlocking(userId, ip, path).pipe(
        switchMap(() => next.handle()),
        tap(() => {
          // Track IP after request completes (non-blocking)
          this.trackUserIp(userId, ip, path).catch((err: unknown) => {
            const errorMessage =
              err instanceof Error
                ? err.message
                : err != null
                  ? JSON.stringify(err)
                  : 'Unknown error';
            this.logger.error(
              'Failed to track user IP',
              { userId, ip, path, error: errorMessage },
              'ip-tracking',
            );
          });
        }),
      );
    }

    // If no userId, just proceed (global blocking already checked in middleware)
    return next.handle();
  }

  /**
   * Check if IP is blocked for this specific user
   * Returns an Observable that throws if blocked, or completes if not blocked
   */
  private checkUserSpecificBlocking(
    userId: string,
    ip: string,
    path: string,
  ): Observable<void> {
    return new Observable<void>((observer) => {
      this.redisService
        .getBlockedIpsByUserId(userId)
        .then((userBlockedIps: string[] | null) => {
          if (userBlockedIps !== null && Array.isArray(userBlockedIps)) {
            if (userBlockedIps.includes(ip)) {
              this.logger.warn(
                'Blocked IP attempt (user-specific)',
                { ip, userId, path },
                'ip-tracking',
              );
              observer.error(
                new HttpException(
                  {
                    statusCode: HttpStatus.FORBIDDEN,
                    message: 'Access denied',
                  },
                  HttpStatus.FORBIDDEN,
                ),
              );
              return;
            }
          }
          observer.next();
          observer.complete();
        })
        .catch((err: unknown) => {
          // On error, allow request (fail open)
          const errorMessage =
            err instanceof Error
              ? err.message
              : err != null
                ? JSON.stringify(err)
                : 'Unknown error';
          this.logger.error(
            'Error checking user-specific IP blocking',
            { userId, ip, path, error: errorMessage },
            'ip-tracking',
          );
          observer.next();
          observer.complete();
        });
    });
  }

  /**
   * Track user IP in Redis (async, non-blocking)
   */
  private async trackUserIp(userId: string, ip: string, path?: string): Promise<void> {
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
        { userId, ip, path, error: errorMessage },
        'ip-tracking',
      );
    }
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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

    // Track IP after request completes (non-blocking)
    return next.handle().pipe(
      tap(() => {
        if (userId && ip && ip !== 'unknown') {
          // Don't await - let it run in background
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
        } else {
          // Debug: log why IP is not tracked
          this.logger.debug(
            'IP not tracked',
            {
              hasUserId: !!userId,
              userId,
              ip,
              path,
              reason: !userId ? 'No userId' : !ip || ip === 'unknown' ? 'Invalid IP' : 'Unknown',
            },
            'ip-tracking',
          );
        }
      }),
    );
  }

  /**
   * Track user IP in Redis (async, non-blocking)
   */
  private async trackUserIp(userId: string, ip: string, path?: string): Promise<void> {
    try {
      await this.redisService.addUserIp(userId, ip, 3600); // 1 hour TTL
      this.logger.info(
        'User IP tracked successfully',
        { userId, ip, path },
        'ip-tracking',
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : err != null ? JSON.stringify(err) : 'Unknown error';
      this.logger.error(
        'Failed to add user IP to Redis',
        { userId, ip, path, error: errorMessage },
        'ip-tracking',
      );
    }
  }
}


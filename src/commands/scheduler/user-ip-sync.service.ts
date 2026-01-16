import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../shared/redis/redis.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { UserIp } from '../../modules/user/domain/entities/user-ip.entity';
import { IUserIpRepository } from '../../modules/user/infrastructure/persistence/repositories/user-ip.repository.interface';

/**
 * User IP Sync Service
 *
 * Scheduler job that runs every 5 minutes to:
 * 1. Read user IPs from Redis (user:ips:*)
 * 2. Batch upsert into user_ips table
 * 3. Clear processed Redis keys (optional - keys expire after TTL)
 */
@Injectable()
export class UserIpSyncService {
  constructor(
    @InjectRepository(UserIp)
    private readonly userIpRepository: Repository<UserIp>,
    @Inject('IUserIpRepository')
    private readonly userIpRepo: IUserIpRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Sync user IPs from Redis to Database
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncUserIps() {
    try {
      // 1. Get all user IP keys from Redis
      const keys = await this.redisService.getUserIpKeys();
      if (keys.length === 0) {
        return;
      }

      // 2. Process each key and collect IPs
      const userIpMap = new Map<string, Set<string>>(); // userId -> Set of IPs

      for (const key of keys) {
        // Extract userId from key: user:ips:{userId}
        const match = key.match(/^user:ips:(.+)$/);
        if (!match) {
          continue;
        }
        const userId = match[1];

        // Get IPs from Redis
        const ips = await this.redisService.getUserIps(userId);
        if (ips.length === 0) {
          continue;
        }

        // Add to map
        if (!userIpMap.has(userId)) {
          userIpMap.set(userId, new Set());
        }
        const ipSet = userIpMap.get(userId);
        if (ipSet) {
          ips.forEach((ip) => ipSet.add(ip));
        }
      }

      // 3. Batch upsert into database
      const totalIps = Array.from(userIpMap.values()).reduce(
        (sum, ipSet) => sum + ipSet.size,
        0,
      );

      if (totalIps === 0) {
        return;
      }

      const bulkData: Array<{ userId: string; ip: string }> = [];
      for (const [userId, ipSet] of userIpMap.entries()) {
        for (const ip of ipSet) {
          bulkData.push({ userId, ip });
        }
      }

      // Batch upsert (in chunks of 1000)
      const chunkSize = 1000;
      for (let i = 0; i < bulkData.length; i += chunkSize) {
        const chunk = bulkData.slice(i, i + chunkSize);
        await this.userIpRepo.bulkUpsert(chunk);
      }

      // 4. Clear processed Redis keys (optional - keep them for a while)
      // We don't delete immediately to allow for retry if DB fails
      // Keys will expire after TTL (1 hour)
    } catch (error) {
      this.logger.error(
        'Error syncing user IPs',
        { error: error instanceof Error ? error.message : String(error) },
        'scheduler',
      );
    }
  }
}

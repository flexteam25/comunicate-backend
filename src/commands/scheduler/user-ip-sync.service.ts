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
 * 3. Update blocked IPs cache
 * 4. Clear processed Redis keys
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
      this.logger.info('Starting user IP sync job', {}, 'scheduler');

      // 1. Get all user IP keys from Redis
      const keys = await this.redisService.getUserIpKeys();
      if (keys.length === 0) {
        this.logger.info('No user IP keys found in Redis', {}, 'scheduler');
        return;
      }

      this.logger.info(`Found ${keys.length} user IP keys in Redis`, {}, 'scheduler');

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
        ips.forEach((ip) => userIpMap.get(userId)!.add(ip));
      }

      // 3. Batch upsert into database
      const totalIps = Array.from(userIpMap.values()).reduce(
        (sum, ipSet) => sum + ipSet.size,
        0,
      );

      if (totalIps === 0) {
        this.logger.info('No IPs to sync', {}, 'scheduler');
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

      this.logger.info(
        `Synced ${totalIps} IPs from ${userIpMap.size} users`,
        { totalIps, userCount: userIpMap.size },
        'scheduler',
      );

      // 4. Update blocked IPs cache
      await this.updateBlockedIpsCache();

      // 5. Clear processed Redis keys (optional - keep them for a while)
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

  /**
   * Update blocked IPs cache in Redis
   * Runs every 10 minutes (separate from sync)
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async updateBlockedIpsCache() {
    try {
      this.logger.info('Updating blocked IPs cache', {}, 'scheduler');

      // Get all blocked IPs from database
      const blockedIps = await this.userIpRepo.findBlockedIps();

      // Update cache
      await this.redisService.cacheBlockedIps(blockedIps, 1800); // 30 minutes TTL

      this.logger.info(
        `Updated blocked IPs cache with ${blockedIps.length} IPs`,
        { count: blockedIps.length },
        'scheduler',
      );
    } catch (error) {
      this.logger.error(
        'Error updating blocked IPs cache',
        { error: error instanceof Error ? error.message : String(error) },
        'scheduler',
      );
    }
  }
}


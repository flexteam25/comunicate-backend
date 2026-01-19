import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../shared/redis/redis.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { UserIp } from '../../modules/user/domain/entities/user-ip.entity';
import { UserProfile } from '../../modules/user/domain/entities/user-profile.entity';
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
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @Inject('IUserIpRepository')
    private readonly userIpRepo: IUserIpRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Sync user IPs from Redis to Database
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
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

      // 4. Update lastRequestIp in user_profile for each user
      // After bulkUpsert, get the most recent IP from database (by updatedAt)
      const userIds = Array.from(userIpMap.keys());
      for (const userId of userIds) {
        try {
          // Get the most recent IP from database (after bulkUpsert, updatedAt will be latest)
          const mostRecentIp = await this.userIpRepository
            .createQueryBuilder('userIp')
            .where('userIp.userId = :userId', { userId })
            .orderBy('userIp.updatedAt', 'DESC')
            .addOrderBy('userIp.createdAt', 'DESC')
            .limit(1)
            .getOne();

          if (mostRecentIp) {
            // Update lastRequestIp in user profile
            const profile = await this.userProfileRepository.findOne({
              where: { userId },
            });

            if (profile) {
              profile.lastRequestIp = mostRecentIp.ip;
              await this.userProfileRepository.save(profile);
            } else {
              // Create new profile if it doesn't exist
              const newProfile = this.userProfileRepository.create({
                userId,
                points: 0,
                lastRequestIp: mostRecentIp.ip,
              });
              await this.userProfileRepository.save(newProfile);
            }
          }
        } catch (error) {
          // Log error but continue with other users
          this.logger.error(
            `Error updating lastRequestIp for user ${userId}`,
            { error: error instanceof Error ? error.message : String(error) },
            'scheduler',
          );
        }
      }

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
}

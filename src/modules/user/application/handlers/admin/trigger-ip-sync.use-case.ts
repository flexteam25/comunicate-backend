import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIp } from '../../../domain/entities/user-ip.entity';
import { UserProfile } from '../../../domain/entities/user-profile.entity';
import { IUserIpRepository } from '../../../infrastructure/persistence/repositories/user-ip.repository.interface';
import { IBlockedIpRepository } from '../../../infrastructure/persistence/repositories/blocked-ip.repository.interface';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { LoggerService } from '../../../../../shared/logger/logger.service';

export interface TriggerIpSyncCommand {
  userId: string;
}

export interface TriggerIpSyncResult {
  userId: string;
  totalIps: number;
  blockedIps: number;
}

@Injectable()
export class TriggerIpSyncUseCase {
  constructor(
    @InjectRepository(UserIp)
    private readonly userIpRepository: Repository<UserIp>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @Inject('IUserIpRepository')
    private readonly userIpRepo: IUserIpRepository,
    @Inject('IBlockedIpRepository')
    private readonly blockedIpRepo: IBlockedIpRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: TriggerIpSyncCommand): Promise<TriggerIpSyncResult> {
    const { userId } = command;

    // 1. Get IPs for this specific user from Redis
    const ips = await this.redisService.getUserIps(userId);

    if (ips.length === 0) {
      // Still update blocked IPs cache for this user
      const blockedIps = await this.userIpRepository.find({
        where: { userId, isBlocked: true },
        select: ['ip'],
      });
      const blockedIpList = blockedIps.map((ui) => ui.ip);
      await this.redisService.cacheBlockedIpsByUserId(userId, blockedIpList, 1800);

      return {
        userId,
        totalIps: 0,
        blockedIps: blockedIpList.length,
      };
    }

    // 2. Batch upsert into database
    const bulkData: Array<{ userId: string; ip: string }> = ips.map((ip) => ({
      userId,
      ip,
    }));

    await this.userIpRepo.bulkUpsert(bulkData);

    // 3. Update lastRequestIp in user_profile
    // After bulkUpsert, get the most recent IP from database (by updatedAt)
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
      // Log error but continue
      this.logger.error(
        `Error updating lastRequestIp for user ${userId}`,
        { error: error instanceof Error ? error.message : String(error) },
        'trigger-ip-sync',
      );
    }

    // 4. Update blocked IPs cache for this user
    const blockedUserIps = await this.userIpRepository.find({
      where: { userId, isBlocked: true },
      select: ['ip'],
    });
    const blockedIpList = blockedUserIps.map((ui) => ui.ip);
    await this.redisService.cacheBlockedIpsByUserId(userId, blockedIpList, 1800);

    return {
      userId,
      totalIps: ips.length,
      blockedIps: blockedIpList.length,
    };
  }
}

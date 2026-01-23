import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';

export interface RejectSiteRequestCommand {
  requestId: string;
  adminId: string;
  rejectionReason?: string;
}

@Injectable()
export class RejectSiteRequestUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: RejectSiteRequestCommand): Promise<SiteRequest> {
    const request = await this.siteRequestRepository.findById(command.requestId, [
      'user',
      'category',
      'tier',
    ]);

    if (!request) {
      throw new NotFoundException('Site request not found');
    }

    // Only allow reject if status = pending
    if (request.status !== SiteRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    // Update request status = rejected
    const updated = await this.siteRequestRepository.update(command.requestId, {
      status: SiteRequestStatus.REJECTED,
      adminId: command.adminId,
      rejectionReason: command.rejectionReason || null,
    });

    // Reload with all relations for event
    const requestWithRelations = await this.siteRequestRepository.findById(
      command.requestId,
      ['user', 'category', 'tier', 'admin'],
    );

    if (!requestWithRelations) {
      return updated;
    }

    // Publish real-time event after update
    setImmediate(() => {
      this.publishSiteRequestRejectedEvent(requestWithRelations).catch((error) => {
        this.logger.error(
          'Failed to publish site-request:rejected event',
          {
            error: error instanceof Error ? error.message : String(error),
            requestId: command.requestId,
          },
          'site-request',
        );
      });
    });

    return requestWithRelations;
  }

  private async publishSiteRequestRejectedEvent(request: SiteRequest): Promise<void> {
    const eventData = {
      id: request.id,
      userId: request.userId,
      user: request.user
        ? {
            id: request.user.id,
            email: request.user.email,
            displayName: request.user.displayName || null,
          }
        : null,
      name: request.name,
      status: request.status,
      rejectionReason: request.rejectionReason || null,
      adminId: request.adminId || null,
      admin: request.admin
        ? {
            id: request.admin.id,
            email: request.admin.email,
            displayName: request.admin.displayName || null,
          }
        : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };

    // Publish to user room
    await this.redisService.publishEvent(RedisChannel.SITE_REQUEST_REJECTED, {
      ...eventData,
      userId: request.userId, // Include userId so socket gateway can route to user.{userId}
    });

    // Publish to admin room (without userId)
    await this.redisService.publishEvent(RedisChannel.SITE_REQUEST_REJECTED, eventData);
  }
}

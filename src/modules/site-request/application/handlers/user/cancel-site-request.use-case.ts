import {
  Injectable,
  Inject,
} from '@nestjs/common';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { SiteRequestRealtimeMapper } from '../../services/site-request-realtime-mapper.service';

export interface CancelSiteRequestCommand {
  requestId: string;
  userId: string;
}

@Injectable()
export class CancelSiteRequestUseCase {
  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly siteRequestRealtimeMapper: SiteRequestRealtimeMapper,
  ) {}

  async execute(command: CancelSiteRequestCommand): Promise<SiteRequest> {
    const request = await this.siteRequestRepository.findById(command.requestId, [
      'user',
      'category',
      'tier',
      'site',
      'admin',
    ]);

    if (!request) {
      throw notFound(MessageKeys.SITE_REQUEST_NOT_FOUND);
    }

    // Check ownership
    if (request.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_CANCEL_OWN_SITE_REQUESTS);
    }

    // Only allow cancel if status is pending
    if (request.status !== SiteRequestStatus.PENDING) {
      throw badRequest(MessageKeys.CAN_ONLY_CANCEL_PENDING_SITE_REQUESTS);
    }

    // Update status to cancelled
    await this.siteRequestRepository.update(command.requestId, {
      status: SiteRequestStatus.CANCELLED,
    });

    // Return the request with updated status and loaded relations
    request.status = SiteRequestStatus.CANCELLED;

    // Reload with all relations for event
    const requestWithRelations = await this.siteRequestRepository.findById(
      command.requestId,
      ['user', 'category', 'tier', 'site', 'admin'],
    );

    if (!requestWithRelations) {
      return request;
    }

    // Update status in reloaded request
    requestWithRelations.status = SiteRequestStatus.CANCELLED;

    // Publish realtime event (same format as API response)
    setImmediate(() => {
      this.publishSiteRequestCancelledEvent(requestWithRelations).catch((error) => {
        this.logger.error(
          'Failed to publish site-request:cancelled event',
          {
            error: error instanceof Error ? error.message : String(error),
            requestId: requestWithRelations.id,
            userId: requestWithRelations.userId,
          },
          'site-request',
        );
      });
    });

    return requestWithRelations;
  }

  private async publishSiteRequestCancelledEvent(request: SiteRequest): Promise<void> {
    // Payload must match API response format (includes userId)
    // SocketGateway will automatically route to both user room and admin room
    const eventData = this.siteRequestRealtimeMapper.mapSiteRequestToResponse(request);
    await this.redisService.publishEvent(RedisChannel.SITE_REQUEST_CANCELLED, eventData);
  }
}

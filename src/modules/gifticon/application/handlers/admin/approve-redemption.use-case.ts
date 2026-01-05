import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  GifticonRedemption,
  GifticonRedemptionStatus,
} from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

export interface ApproveRedemptionCommand {
  redemptionId: string;
}

@Injectable()
export class ApproveRedemptionUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: ApproveRedemptionCommand): Promise<GifticonRedemption> {
    const redemption = await this.redemptionRepository.findById(command.redemptionId);

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    if (redemption.status !== GifticonRedemptionStatus.PENDING) {
      throw new BadRequestException('Only pending redemptions can be approved');
    }

    const updatedRedemption = await this.redemptionRepository.update(command.redemptionId, {
      status: GifticonRedemptionStatus.COMPLETED,
    });

    // Reload with relationships for event
    const redemptionWithRelations = await this.redemptionRepository.findById(
      updatedRedemption.id,
      ['user', 'gifticon'],
    );

    if (!redemptionWithRelations) {
      return updatedRedemption;
    }

    // Map redemption to response format (same as admin API response)
    const eventData = this.mapRedemptionToResponse(redemptionWithRelations);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.REDEMPTION_APPROVED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish redemption:approved event',
            {
              error: error instanceof Error ? error.message : String(error),
              redemptionId: updatedRedemption.id,
            },
            'gifticon',
          );
        });
    });

    return redemptionWithRelations;
  }

  private mapRedemptionToResponse(redemption: any): any {
    return {
      id: redemption.id,
      userId: redemption.userId,
      user: redemption.user
        ? {
            id: redemption.user.id,
            email: redemption.user.email,
            displayName: redemption.user.displayName || null,
          }
        : null,
      gifticonId: redemption.gifticonId,
      gifticon: redemption.gifticon
        ? this.mapGifticonToResponse(redemption.gifticon)
        : redemption.gifticonSnapshot
          ? {
              title: redemption.gifticonSnapshot.title,
              amount: redemption.gifticonSnapshot.amount,
              imageUrl: redemption.gifticonSnapshot.imageUrl
                ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                : null,
              summary: redemption.gifticonSnapshot.summary || null,
              typeColor: redemption.gifticonSnapshot.typeColor || null,
            }
          : null,
      pointsUsed: redemption.pointsUsed,
      status: redemption.status,
      redemptionCode: redemption.redemptionCode || null,
      cancelledAt: redemption.cancelledAt || null,
      cancellationReason: redemption.cancellationReason || null,
      createdAt: redemption.createdAt,
      updatedAt: redemption.updatedAt,
    };
  }

  private mapGifticonToResponse(gifticon: any): any {
    return {
      id: gifticon.id,
      title: gifticon.title,
      slug: gifticon.slug || null,
      summary: gifticon.summary || null,
      content: gifticon.content,
      status: gifticon.status,
      amount: gifticon.amount,
      typeColor: gifticon.typeColor || null,
      startsAt: gifticon.startsAt || null,
      endsAt: gifticon.endsAt || null,
      imageUrl: buildFullUrl(this.apiServiceUrl, gifticon.imageUrl || null) || null,
      createdAt: gifticon.createdAt,
      updatedAt: gifticon.updatedAt,
    };
  }
}

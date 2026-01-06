import { Injectable, Inject } from '@nestjs/common';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import {
  Inquiry,
  InquiryStatus,
  InquiryCategory,
} from '../../../domain/entities/inquiry.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

export interface CreateInquiryCommand {
  userId: string;
  title: string;
  category: InquiryCategory;
  message: string;
  images?: string[];
  ipAddress?: string;
}

@Injectable()
export class CreateInquiryUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: CreateInquiryCommand): Promise<Inquiry> {
    const savedInquiry = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const inquiryRepo = manager.getRepository(Inquiry);

        const inquiry = inquiryRepo.create({
          userId: command.userId,
          title: command.title,
          category: command.category,
          message: command.message,
          images: command.images || [],
          status: InquiryStatus.PENDING,
          ipAddress: command.ipAddress || null,
        });

        return inquiryRepo.save(inquiry);
      },
    );

    // Reload inquiry with user relation for event
    const inquiryWithRelations = await this.inquiryRepository.findById(
      savedInquiry.id,
      ['user'],
    );

    if (!inquiryWithRelations) {
      return savedInquiry;
    }

    // Map inquiry to response format for event (same as admin API response)
    const eventData = {
      id: inquiryWithRelations.id,
      userId: inquiryWithRelations.userId,
      user: inquiryWithRelations.user
        ? {
            id: inquiryWithRelations.user.id,
            email: inquiryWithRelations.user.email,
            displayName: inquiryWithRelations.user.displayName,
          }
        : null,
      title: inquiryWithRelations.title,
      category: inquiryWithRelations.category,
      message: inquiryWithRelations.message,
      images:
        inquiryWithRelations.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
      status: inquiryWithRelations.status,
      adminId: inquiryWithRelations.adminId || null,
      admin: inquiryWithRelations.admin
        ? {
            id: inquiryWithRelations.admin.id,
            email: inquiryWithRelations.admin.email,
            displayName: inquiryWithRelations.admin.displayName,
          }
        : null,
      adminReply: inquiryWithRelations.adminReply || null,
      repliedAt: inquiryWithRelations.repliedAt || null,
      createdAt: inquiryWithRelations.createdAt,
      updatedAt: inquiryWithRelations.updatedAt,
    };

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.INQUIRY_CREATED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish inquiry:created event',
            {
              error: error instanceof Error ? error.message : String(error),
              inquiryId: savedInquiry.id,
              userId: command.userId,
            },
            'support',
          );
        });
    });

    return inquiryWithRelations;
  }
}

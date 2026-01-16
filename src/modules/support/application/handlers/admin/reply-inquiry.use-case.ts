import { Injectable, Inject } from '@nestjs/common';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

// Admin can only use PENDING and RESOLVED statuses
const ALLOWED_ADMIN_STATUSES = [InquiryStatus.PENDING, InquiryStatus.RESOLVED];

export interface ReplyInquiryCommand {
  inquiryId: string;
  adminId: string;
  reply: string;
  status?: InquiryStatus;
}

@Injectable()
export class ReplyInquiryUseCase {
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

  async execute(command: ReplyInquiryCommand): Promise<Inquiry> {
    // Check if inquiry exists and get userId
    const existingInquiry = await this.inquiryRepository.findById(command.inquiryId);
    if (!existingInquiry) {
      throw notFound(MessageKeys.INQUIRY_NOT_FOUND);
    }

    // Validate status: admin can only use PENDING and RESOLVED
    if (command.status && !ALLOWED_ADMIN_STATUSES.includes(command.status)) {
      throw badRequest(MessageKeys.INVALID_INQUIRY_STATUS_FOR_ADMIN);
    }

    const userId = existingInquiry.userId;

    const savedInquiry = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const inquiryRepo = manager.getRepository(Inquiry);

        existingInquiry.adminId = command.adminId;
        existingInquiry.adminReply = command.reply;
        existingInquiry.repliedAt = new Date();
        if (command.status) {
          existingInquiry.status = command.status;
        }
        // Note: No automatic status change to PROCESSING - admin must explicitly set status

        return inquiryRepo.save(existingInquiry);
      },
    );

    // Reload inquiry with relationships for event
    const inquiryWithRelations = await this.inquiryRepository.findById(savedInquiry.id, [
      'user',
      'admin',
    ]);

    if (!inquiryWithRelations) {
      return savedInquiry;
    }

    // Map inquiry to response format (admin format)
    const eventData = {
      id: inquiryWithRelations.id,
      userId: inquiryWithRelations.userId,
      user: inquiryWithRelations.user
        ? {
            id: inquiryWithRelations.user.id,
            email: inquiryWithRelations.user.email,
            displayName: inquiryWithRelations.user.displayName,
          }
        : undefined,
      title: inquiryWithRelations.title,
      category: inquiryWithRelations.category,
      message: inquiryWithRelations.message,
      images:
        inquiryWithRelations.images?.map((img) =>
          buildFullUrl(this.apiServiceUrl, img),
        ) || [],
      status: inquiryWithRelations.status,
      adminId: inquiryWithRelations.adminId,
      admin: inquiryWithRelations.admin
        ? {
            id: inquiryWithRelations.admin.id,
            email: inquiryWithRelations.admin.email,
            displayName: inquiryWithRelations.admin.displayName,
          }
        : undefined,
      adminReply: inquiryWithRelations.adminReply,
      repliedAt: inquiryWithRelations.repliedAt,
      createdAt: inquiryWithRelations.createdAt,
      updatedAt: inquiryWithRelations.updatedAt,
    };

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.INQUIRY_REPLIED as string, {
          ...eventData,
          userId, // Include userId for routing
        })
        .catch((error) => {
          this.logger.error(
            'Failed to publish inquiry:replied event',
            {
              error: error instanceof Error ? error.message : String(error),
              inquiryId: command.inquiryId,
              userId,
            },
            'support',
          );
        });
    });

    return inquiryWithRelations;
  }
}

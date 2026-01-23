import {
  Injectable,
  Inject,
} from '@nestjs/common';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import { ISiteCategoryRepository } from '../../../../site/infrastructure/persistence/repositories/site-category.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../../site-request/domain/entities/site-request.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import {
  badRequest,
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CreateSiteRequestCommand {
  userId: string;
  name: string;
  categoryId: string;
  logo?: MulterFile;
  mainImage?: MulterFile;
  siteImage?: MulterFile;
  tierId?: string;
  permanentUrl?: string;
  description?: string;
  firstCharge?: number;
  recharge?: number;
  experience?: number;
  ipAddress?: string;
}

@Injectable()
export class CreateSiteRequestUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: CreateSiteRequestCommand): Promise<SiteRequest> {
    // Validate category exists
    const category = await this.siteCategoryRepository.findById(command.categoryId);
    if (!category) {
      throw badRequest(MessageKeys.CATEGORY_NOT_FOUND);
    }

    // Validate tier exists if provided
    if (command.tierId) {
      const tier = await this.tierRepository.findById(command.tierId);
      if (!tier) {
        throw badRequest(MessageKeys.TIER_NOT_FOUND);
      }
    }

    // Validate file sizes (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (command.logo && command.logo.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, { maxSize: '20MB' });
    }
    if (command.mainImage && command.mainImage.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, { maxSize: '20MB' });
    }
    if (command.siteImage && command.siteImage.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, { maxSize: '20MB' });
    }

    // Validate file types
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.logo && !allowedTypes.test(command.logo.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }
    if (command.mainImage && !allowedTypes.test(command.mainImage.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }
    if (command.siteImage && !allowedTypes.test(command.siteImage.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }

    // Check duplicate name with sites
    const existingSite = await this.siteRepository.findAllWithCursor(
      {
        search: command.name,
      },
      undefined,
      1,
    );
    if (existingSite.data.length > 0) {
      const site = existingSite.data[0];
      if (site.name.toLowerCase() === command.name.toLowerCase()) {
        throw badRequest(MessageKeys.SITE_REQUEST_NAME_ALREADY_EXISTS);
      }
    }

    // Check duplicate name with pending requests
    const pendingRequest = await this.siteRequestRepository.findPendingByName(
      command.name,
    );
    if (pendingRequest) {
      throw badRequest(MessageKeys.SITE_REQUEST_PENDING_ALREADY_EXISTS);
    }

    // Generate request ID first
    const requestId = randomUUID();

    // Upload images before transaction (to site-requests/{requestId} folder)
    let logoUrl: string | undefined;
    let mainImageUrl: string | undefined;
    let siteImageUrl: string | undefined;

    const requestFolder = `site-requests/${requestId}`;

    try {
      if (command.logo) {
        const result = await this.uploadService.uploadImage(command.logo, {
          folder: `${requestFolder}/logo`,
        });
        logoUrl = result.relativePath;
      }

      if (command.mainImage) {
        const result = await this.uploadService.uploadImage(command.mainImage, {
          folder: `${requestFolder}/main`,
        });
        mainImageUrl = result.relativePath;
      }

      if (command.siteImage) {
        const result = await this.uploadService.uploadImage(command.siteImage, {
          folder: `${requestFolder}/site`,
        });
        siteImageUrl = result.relativePath;
      }

      // Create site request within transaction
      const siteRequest = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const requestRepo = manager.getRepository(SiteRequest);

          const newRequest = requestRepo.create({
            id: requestId,
            userId: command.userId,
            name: command.name,
            categoryId: command.categoryId,
            logoUrl,
            mainImageUrl,
            siteImageUrl,
            tierId: command.tierId,
            permanentUrl: command.permanentUrl,
            description: command.description,
            firstCharge: command.firstCharge,
            recharge: command.recharge,
            experience: command.experience || 0,
            status: SiteRequestStatus.PENDING,
            ipAddress: command.ipAddress,
          });

          return requestRepo.save(newRequest);
        },
      );

      // Reload request with relations for event
      const requestWithRelations = await this.siteRequestRepository.findById(
        siteRequest.id,
        ['user', 'category', 'tier'],
      );

      if (!requestWithRelations) {
        throw notFound(MessageKeys.SITE_REQUEST_NOT_FOUND_AFTER_CREATE);
      }

      // Publish real-time event after transaction
      setImmediate(() => {
        this.publishSiteRequestCreatedEvent(requestWithRelations).catch((error) => {
          this.logger.error(
            'Failed to publish site-request:created event',
            {
              requestId: requestWithRelations.id,
              error: error instanceof Error ? error.message : String(error),
            },
            'site-request',
          );
        });
      });

      return requestWithRelations;
    } catch (error) {
      // Cleanup uploaded files if transaction fails
      if (logoUrl) {
        try {
          await this.uploadService.deleteFile(logoUrl);
        } catch {
          // Ignore delete errors
        }
      }
      if (mainImageUrl) {
        try {
          await this.uploadService.deleteFile(mainImageUrl);
        } catch {
          // Ignore delete errors
        }
      }
      if (siteImageUrl) {
        try {
          await this.uploadService.deleteFile(siteImageUrl);
        } catch {
          // Ignore delete errors
        }
      }
      throw error;
    }
  }

  private async publishSiteRequestCreatedEvent(request: SiteRequest): Promise<void> {
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
      categoryId: request.categoryId,
      category: request.category
        ? {
            id: request.category.id,
            name: request.category.name,
          }
        : null,
      status: request.status,
      createdAt: request.createdAt,
    };

    await this.redisService.publishEvent(RedisChannel.SITE_REQUEST_CREATED, eventData);
  }
}

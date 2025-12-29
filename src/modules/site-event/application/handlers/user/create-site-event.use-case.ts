import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { SiteEventBanner } from '../../../domain/entities/site-event-banner.entity';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';

export interface CreateSiteEventCommand {
  userId: string;
  siteId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  banners?: Array<{ image?: MulterFile; linkUrl?: string; order: number }>;
}

@Injectable()
export class CreateSiteEventUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateSiteEventCommand): Promise<SiteEvent> {
    // Validate site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      command.siteId,
      command.userId,
    );

    if (!manager) {
      throw new ForbiddenException(
        'You do not have permission to create events for this site',
      );
    }

    // Validate date range
    if (command.endDate <= command.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate and upload banners before transaction
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    const uploadedBannerUrls: Array<{
      imageUrl: string | null;
      linkUrl?: string;
      order: number;
      isUploadedFile: boolean; // Track if this is an uploaded file or a link URL
    }> = [];

    if (command.banners && command.banners.length > 0) {
      if (command.banners.length > 10) {
        throw new BadRequestException('Maximum 10 banners allowed');
      }

      for (let i = 0; i < command.banners.length; i++) {
        const banner = command.banners[i];

        // Validate: banner must have either image or linkUrl
        if (!banner.image && !banner.linkUrl) {
          throw new BadRequestException(
            `Banner ${i + 1} must have either an image file or a link URL`,
          );
        }

        if (banner.image) {
          // Upload file if image is provided
          if (banner.image.size > maxSize) {
            throw new BadRequestException(`Banner ${i + 1} file size exceeds 20MB`);
          }
          if (!allowedTypes.test(banner.image.mimetype)) {
            throw new BadRequestException(
              `Invalid banner ${i + 1} file type. Allowed: jpg, jpeg, png, webp`,
            );
          }

          const uploadResult = await this.uploadService.uploadImage(banner.image, {
            folder: `site-events/${command.siteId}`,
          });
          uploadedBannerUrls.push({
            imageUrl: uploadResult.relativePath,
            linkUrl: banner.linkUrl,
            order: banner.order,
            isUploadedFile: true,
          });
        } else {
          // If only linkUrl (no file upload), imageUrl should be null
          uploadedBannerUrls.push({
            imageUrl: null, // null for link-only banners
            linkUrl: banner.linkUrl,
            order: banner.order,
            isUploadedFile: false, // This is a link URL, not an uploaded file
          });
        }
      }
    }

    // Create event within transaction
    try {
      return await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const eventRepo = manager.getRepository(SiteEvent);
          const bannerRepo = manager.getRepository(SiteEventBanner);

          const eventId = randomUUID();
          const event = eventRepo.create({
            id: eventId,
            siteId: command.siteId,
            userId: command.userId,
            title: command.title,
            description: command.description,
            startDate: command.startDate,
            endDate: command.endDate,
            isActive: false, // User-created events need admin approval
          });

          const savedEvent = await eventRepo.save(event);

          // Create banners
          if (uploadedBannerUrls.length > 0) {
            const bannerEntities = uploadedBannerUrls.map((banner) =>
              bannerRepo.create({
                eventId: savedEvent.id,
                imageUrl: banner.imageUrl, // Can be null for link-only banners
                linkUrl: banner.linkUrl,
                order: banner.order,
                isActive: true,
              }),
            );
            await bannerRepo.save(bannerEntities);
          }

          // Reload with relations
          const reloaded = await eventRepo.findOne({
            where: { id: savedEvent.id },
            relations: ['site', 'user', 'banners'],
          });

          if (!reloaded) {
            throw new Error('Failed to reload event after creation');
          }

          return reloaded;
        },
      );
    } catch (error) {
      // Cleanup newly uploaded files if transaction fails (only uploaded files, not link URLs)
      for (const banner of uploadedBannerUrls) {
        if (banner.isUploadedFile && banner.imageUrl) {
          try {
            await this.uploadService.deleteFile(banner.imageUrl);
          } catch (deleteError) {
            console.error(
              'Failed to cleanup banner after transaction failure:',
              deleteError,
            );
          }
        }
      }
      throw error;
    }
  }
}

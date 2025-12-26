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
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';

export interface UpdateSiteEventCommand {
  userId: string;
  eventId: string;
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  banners?: Array<{ image: MulterFile; linkUrl?: string; order: number }>;
}

@Injectable()
export class UpdateSiteEventUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateSiteEventCommand): Promise<SiteEvent> {
    // Get existing event
    const existingEvent = await this.siteEventRepository.findById(command.eventId, [
      'site',
      'user',
      'banners',
    ]);

    if (!existingEvent) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      existingEvent.siteId,
      command.userId,
    );

    if (!manager) {
      throw new ForbiddenException(
        'You do not have permission to update events for this site',
      );
    }

    // Validate date range if dates are being updated
    const startDate = command.startDate || existingEvent.startDate;
    const endDate = command.endDate || existingEvent.endDate;
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate and upload new banners before transaction
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    const uploadedBannerUrls: Array<{ imageUrl: string; linkUrl?: string; order: number }> = [];
    const oldBannerUrls: string[] = [];

    if (command.banners !== undefined) {
      if (command.banners.length > 10) {
        throw new BadRequestException('Maximum 10 banners allowed');
      }

      // Collect old banner URLs for cleanup
      if (existingEvent.banners) {
        for (const banner of existingEvent.banners) {
          oldBannerUrls.push(banner.imageUrl);
        }
      }

      // Upload new banners
      for (let i = 0; i < command.banners.length; i++) {
        const banner = command.banners[i];
        if (banner.image.size > maxSize) {
          throw new BadRequestException(`Banner ${i + 1} file size exceeds 20MB`);
        }
        if (!allowedTypes.test(banner.image.mimetype)) {
          throw new BadRequestException(
            `Invalid banner ${i + 1} file type. Allowed: jpg, jpeg, png, webp`,
          );
        }

        const uploadResult = await this.uploadService.uploadImage(banner.image, {
          folder: `site-events/${existingEvent.siteId}`,
        });
        uploadedBannerUrls.push({
          imageUrl: uploadResult.relativePath,
          linkUrl: banner.linkUrl,
          order: banner.order,
        });
      }
    }

    // Update event within transaction
    try {
      return await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const eventRepo = manager.getRepository(SiteEvent);
          const bannerRepo = manager.getRepository(SiteEventBanner);

          const updateData: Partial<SiteEvent> = {};
          if (command.title !== undefined) updateData.title = command.title;
          if (command.description !== undefined) updateData.description = command.description;
          if (command.startDate !== undefined) updateData.startDate = command.startDate;
          if (command.endDate !== undefined) updateData.endDate = command.endDate;
          updateData.isActive = false; // Reset to false - needs admin approval again

          await eventRepo.update(command.eventId, updateData);

          // Replace banners if provided
          if (command.banners !== undefined) {
            // Delete existing banners
            await bannerRepo.delete({ eventId: command.eventId });

            // Create new banners
            if (uploadedBannerUrls.length > 0) {
              const bannerEntities = uploadedBannerUrls.map((banner) =>
                bannerRepo.create({
                  eventId: command.eventId,
                  imageUrl: banner.imageUrl,
                  linkUrl: banner.linkUrl,
                  order: banner.order,
                  isActive: true,
                }),
              );
              await bannerRepo.save(bannerEntities);
            }
          }

          // Reload with relations
          const reloaded = await eventRepo.findOne({
            where: { id: command.eventId },
            relations: ['site', 'user', 'banners'],
          });

          if (!reloaded) {
            throw new Error('Failed to reload event after update');
          }

          return reloaded;
        },
      );
    } catch (error) {
      // Cleanup newly uploaded files if transaction fails
      for (const banner of uploadedBannerUrls) {
        try {
          await this.uploadService.deleteFile(banner.imageUrl);
        } catch (deleteError) {
          console.error('Failed to cleanup banner after transaction failure:', deleteError);
        }
      }
      throw error;
    } finally {
      // Cleanup old banner files after successful transaction
      // This runs even if there was an error, but oldBannerUrls will be empty if transaction failed
      if (command.banners !== undefined && uploadedBannerUrls.length > 0) {
        for (const oldUrl of oldBannerUrls) {
          try {
            await this.uploadService.deleteFile(oldUrl);
          } catch (deleteError) {
            console.error('Failed to cleanup old banner:', deleteError);
          }
        }
      }
    }
  }
}


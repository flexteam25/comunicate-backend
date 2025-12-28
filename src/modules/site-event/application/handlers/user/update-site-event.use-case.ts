import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
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
  banners?: Array<{ image?: MulterFile; linkUrl?: string; order: number }>;
  deleteBannerIds?: string[];
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
    const newBannerUrls: Array<{
      imageUrl: string | null;
      linkUrl?: string;
      order: number;
      isUploadedFile: boolean; // Track if this is an uploaded file or a link URL
    }> = [];
    const bannersToDelete: string[] = [];
    const oldBannerUrls: string[] = [];

    // Get current max order to calculate new orders
    let maxOrder = -1;
    if (existingEvent.banners && existingEvent.banners.length > 0) {
      maxOrder = Math.max(...existingEvent.banners.map((b) => b.order));
    }

    // Process new banners (add to existing, not replace)
    // Skip if banners array is empty
    if (command.banners !== undefined && command.banners.length > 0) {
      // Check total banners count (existing + new)
      const existingBannerCount = existingEvent.banners?.length || 0;
      const newBannerCount = command.banners.length;
      const totalBanners = existingBannerCount + newBannerCount;

      if (totalBanners > 10) {
        throw new BadRequestException('Maximum 10 banners allowed per event');
      }

      // Calculate starting order for new banners
      let nextOrder = maxOrder + 1;

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
            folder: `site-events/${existingEvent.siteId}`,
          });
          newBannerUrls.push({
            imageUrl: uploadResult.relativePath,
            linkUrl: banner.linkUrl,
            order: nextOrder++,
            isUploadedFile: true,
          });
        } else {
          // If only linkUrl (no file upload), imageUrl should be null
          newBannerUrls.push({
            imageUrl: null, // null for link-only banners
            linkUrl: banner.linkUrl,
            order: nextOrder++,
            isUploadedFile: false, // This is a link URL, not an uploaded file
          });
        }
      }
    }

    // Process delete banner IDs
    if (command.deleteBannerIds && command.deleteBannerIds.length > 0) {
      // Validate that banners to delete belong to this event
      if (existingEvent.banners) {
        const existingBannerIds = existingEvent.banners.map((b) => b.id);
        for (const deleteId of command.deleteBannerIds) {
          if (!existingBannerIds.includes(deleteId)) {
            throw new BadRequestException(
              `Banner with ID ${deleteId} does not belong to this event`,
            );
          }
        }
      }
      bannersToDelete.push(...command.deleteBannerIds);
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

          // Delete banners by IDs if provided
          if (bannersToDelete.length > 0) {
            // Collect old banner URLs for cleanup (only uploaded files, not link URLs)
            if (existingEvent.banners) {
              for (const banner of existingEvent.banners) {
                if (
                  bannersToDelete.includes(banner.id) &&
                  banner.imageUrl &&
                  !banner.imageUrl.startsWith('http')
                ) {
                  oldBannerUrls.push(banner.imageUrl);
                }
              }
            }
            await bannerRepo.delete({ id: In(bannersToDelete) });
          }

          // Add new banners (push to existing, not replace)
          // Skip if newBannerUrls is empty
          if (newBannerUrls.length > 0) {
            const bannerEntities = newBannerUrls.map((banner) =>
              bannerRepo.create({
                eventId: command.eventId,
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
      // Cleanup newly uploaded files if transaction fails (only uploaded files, not link URLs)
      for (const banner of newBannerUrls) {
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
    } finally {
      // Cleanup deleted banner files after successful transaction (only uploaded files)
      if (oldBannerUrls.length > 0) {
        for (const oldUrl of oldBannerUrls) {
          try {
            await this.uploadService.deleteFile(oldUrl);
          } catch (deleteError) {
            console.error('Failed to cleanup deleted banner:', deleteError);
          }
        }
      }
    }
  }
}


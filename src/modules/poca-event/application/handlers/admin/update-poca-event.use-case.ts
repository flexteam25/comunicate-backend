import { Injectable, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { PocaEventBanner } from '../../../domain/entities/poca-event-banner.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdatePocaEventCommand {
  eventId: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  status?: PocaEventStatus;
  startsAt?: Date;
  endsAt?: Date;
  primaryBanner?: MulterFile;
  deletePrimaryBanner?: boolean;
  banners?: Array<{ image: MulterFile; order: number }>;
  deleteBanners?: boolean;
}

@Injectable()
export class UpdatePocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdatePocaEventCommand): Promise<PocaEvent> {
    // Get existing event first to check for old files
    const existingEvent = await this.pocaEventRepository.findById(command.eventId, [
      'banners',
    ]);
    if (!existingEvent) {
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    // Validate file sizes and types
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;

    if (command.primaryBanner) {
      if (command.primaryBanner.size > maxSize) {
        throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
          fileType: 'primary banner',
          maxSize: '20MB',
        });
      }
      if (!allowedTypes.test(command.primaryBanner.mimetype)) {
        throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
          allowedTypes: 'jpg, jpeg, png, webp',
        });
      }
    }

    if (command.banners) {
      for (let i = 0; i < command.banners.length; i++) {
        const banner = command.banners[i];
        if (banner.image.size > maxSize) {
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
            fileType: `banner ${i + 1}`,
            maxSize: '20MB',
          });
        }
        if (!allowedTypes.test(banner.image.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
      }
    }

    // Store old file URLs for cleanup
    const oldPrimaryBannerUrl = existingEvent.primaryBannerUrl;
    const oldBannerUrls: string[] = [];

    // Upload new images before transaction
    let primaryBannerUrl: string | null | undefined;
    const uploadedBannerUrls: Array<{ imageUrl: string; order: number }> = [];

    if (command.primaryBanner) {
      const uploadResult = await this.uploadService.uploadImage(command.primaryBanner, {
        folder: 'poca-events',
      });
      primaryBannerUrl = uploadResult.relativePath;
    } else if (command.deletePrimaryBanner) {
      primaryBannerUrl = null;
    }

    if (command.banners && command.banners.length > 0) {
      // Get old banner URLs for cleanup
      if (existingEvent.banners) {
        oldBannerUrls.push(...existingEvent.banners.map((b) => b.imageUrl));
      }

      for (const banner of command.banners) {
        const uploadResult = await this.uploadService.uploadImage(banner.image, {
          folder: 'poca-events',
        });
        uploadedBannerUrls.push({
          imageUrl: uploadResult.relativePath,
          order: banner.order,
        });
      }
    } else if (command.deleteBanners) {
      // Get old banner URLs for cleanup
      if (existingEvent.banners) {
        oldBannerUrls.push(...existingEvent.banners.map((b) => b.imageUrl));
      }
    }

    // Update event within transaction
    try {
      const event = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const eventRepo = manager.getRepository(PocaEvent);
          const bannerRepo = manager.getRepository(PocaEventBanner);

          const event = await eventRepo.findOne({
            where: { id: command.eventId, deletedAt: null },
            relations: ['banners'],
          });

          if (!event) {
            throw notFound(MessageKeys.EVENT_NOT_FOUND);
          }

          // Validate dates
          if (command.startsAt && command.endsAt) {
            if (command.startsAt >= command.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          } else if (command.startsAt && event.endsAt) {
            if (command.startsAt >= event.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          } else if (command.endsAt && event.startsAt) {
            if (event.startsAt >= command.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          }

          // Check slug uniqueness if provided
          if (command.slug && command.slug !== event.slug) {
            const existing = await eventRepo.findOne({
              where: { slug: command.slug, deletedAt: null },
            });
            if (existing) {
              throw badRequest(MessageKeys.SLUG_ALREADY_EXISTS);
            }
          }

          // Update event fields
          if (command.title !== undefined) event.title = command.title;
          if (command.slug !== undefined) event.slug = command.slug || null;
          if (command.summary !== undefined) event.summary = command.summary || null;
          if (command.content !== undefined) event.content = command.content;
          if (command.status !== undefined) event.status = command.status;
          if (command.startsAt !== undefined) event.startsAt = command.startsAt || null;
          if (command.endsAt !== undefined) event.endsAt = command.endsAt || null;
          if (primaryBannerUrl !== undefined) event.primaryBannerUrl = primaryBannerUrl;

          await eventRepo.save(event);

          // Replace banners if provided or delete if requested
          if (command.banners !== undefined || command.deleteBanners) {
            // Delete existing banners
            await bannerRepo.delete({ eventId: event.id });

            // Create new banners if provided
            if (uploadedBannerUrls.length > 0) {
              const banners = uploadedBannerUrls.map((b) =>
                bannerRepo.create({
                  eventId: event.id,
                  imageUrl: b.imageUrl,
                  order: b.order,
                }),
              );
              await bannerRepo.save(banners);
            }
          }

          // Reload with relations
          const reloaded = await eventRepo.findOne({
            where: { id: event.id },
            relations: ['banners'],
            order: { banners: { order: 'ASC' } },
          });

          if (!reloaded) {
            throw notFound(MessageKeys.POCA_EVENT_NOT_FOUND_AFTER_UPDATE);
          }

          return reloaded;
        },
      );

      // Delete old files after successful transaction (best effort)
      const cleanupPromises: Promise<void>[] = [];
      if (
        primaryBannerUrl !== undefined &&
        primaryBannerUrl !== null &&
        oldPrimaryBannerUrl
      ) {
        cleanupPromises.push(this.uploadService.deleteFile(oldPrimaryBannerUrl));
      }
      if (command.deletePrimaryBanner && oldPrimaryBannerUrl) {
        cleanupPromises.push(this.uploadService.deleteFile(oldPrimaryBannerUrl));
      }
      for (const oldUrl of oldBannerUrls) {
        cleanupPromises.push(this.uploadService.deleteFile(oldUrl));
      }
      await Promise.allSettled(cleanupPromises);

      return event;
    } catch (transactionError) {
      // If transaction fails, cleanup newly uploaded files (best effort)
      const cleanupPromises: Promise<void>[] = [];
      if (primaryBannerUrl && command.primaryBanner) {
        cleanupPromises.push(this.uploadService.deleteFile(primaryBannerUrl));
      }
      for (const banner of uploadedBannerUrls) {
        cleanupPromises.push(this.uploadService.deleteFile(banner.imageUrl));
      }
      // Attempt cleanup (ignore cleanup errors to avoid masking original error)
      await Promise.allSettled(cleanupPromises);
      throw transactionError;
    }
  }
}

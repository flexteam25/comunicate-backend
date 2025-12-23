import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { PocaEventBanner } from '../../../domain/entities/poca-event-banner.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';

export interface CreatePocaEventCommand {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  status?: PocaEventStatus;
  startsAt?: Date;
  endsAt?: Date;
  primaryBanner?: MulterFile;
  banners?: Array<{ image: MulterFile; order: number }>;
}

@Injectable()
export class CreatePocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreatePocaEventCommand): Promise<PocaEvent> {
    // Validate file sizes and types
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;

    if (command.primaryBanner) {
      if (command.primaryBanner.size > maxSize) {
        throw new BadRequestException('Primary banner file size exceeds 20MB');
      }
      if (!allowedTypes.test(command.primaryBanner.mimetype)) {
        throw new BadRequestException(
          'Invalid primary banner file type. Allowed: jpg, jpeg, png, webp',
        );
      }
    }

    if (command.banners) {
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
      }
    }

    // Upload images before transaction
    let primaryBannerUrl: string | undefined;
    const uploadedBannerUrls: Array<{ imageUrl: string; order: number }> = [];

    if (command.primaryBanner) {
      const uploadResult = await this.uploadService.uploadImage(command.primaryBanner, {
        folder: 'poca-events',
      });
      primaryBannerUrl = uploadResult.relativePath;
    }

    if (command.banners && command.banners.length > 0) {
      for (const banner of command.banners) {
        const uploadResult = await this.uploadService.uploadImage(banner.image, {
          folder: 'poca-events',
        });
        uploadedBannerUrls.push({
          imageUrl: uploadResult.relativePath,
          order: banner.order,
        });
      }
    }

    // Create event within transaction
    try {
      const event = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const eventRepo = manager.getRepository(PocaEvent);
          const bannerRepo = manager.getRepository(PocaEventBanner);

          // Generate slug if not provided
          let slug = command.slug;
          if (!slug) {
            slug = this.generateSlug(command.title);
            // Ensure uniqueness
            let counter = 1;
            let uniqueSlug = slug;
            while (
              await eventRepo.findOne({
                where: { slug: uniqueSlug, deletedAt: null },
              })
            ) {
              uniqueSlug = `${slug}-${counter}`;
              counter++;
            }
            slug = uniqueSlug;
          } else {
            // Check if slug already exists
            const existing = await eventRepo.findOne({
              where: { slug, deletedAt: null },
            });
            if (existing) {
              throw new BadRequestException('Slug already exists');
            }
          }

          // Validate dates
          if (command.startsAt && command.endsAt) {
            if (command.startsAt >= command.endsAt) {
              throw new BadRequestException('Start date must be before end date');
            }
          }

          // Create event
          const event = eventRepo.create({
            title: command.title,
            slug,
            summary: command.summary,
            content: command.content,
            status: command.status || PocaEventStatus.DRAFT,
            startsAt: command.startsAt,
            endsAt: command.endsAt,
            primaryBannerUrl,
            viewCount: 0,
          });

          const savedEvent = await eventRepo.save(event);

          // Create banners if provided
          if (uploadedBannerUrls.length > 0) {
            const banners = uploadedBannerUrls.map((b) =>
              bannerRepo.create({
                eventId: savedEvent.id,
                imageUrl: b.imageUrl,
                order: b.order,
              }),
            );
            await bannerRepo.save(banners);
          }

          // Reload with relations
          const reloaded = await eventRepo.findOne({
            where: { id: savedEvent.id },
            relations: ['banners'],
            order: { banners: { order: 'ASC' } },
          });

          if (!reloaded) {
            throw new Error('Failed to reload event after creation');
          }

          return reloaded;
        },
      );
      return event;
    } catch (transactionError) {
      // If transaction fails, cleanup uploaded files (best effort)
      const cleanupPromises: Promise<void>[] = [];
      if (primaryBannerUrl) {
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

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

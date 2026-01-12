import { Injectable, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateGifticonCommand {
  gifticonId: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  status?: GifticonStatus;
  startsAt?: Date;
  endsAt?: Date;
  image?: MulterFile;
  deleteImage?: boolean;
  amount?: number;
  typeColor?: string;
}

@Injectable()
export class UpdateGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateGifticonCommand): Promise<Gifticon> {
    // Get existing gifticon first to check for old file
    const existingGifticon = await this.gifticonRepository.findById(command.gifticonId);
    if (!existingGifticon) {
      throw notFound(MessageKeys.GIFTICON_NOT_FOUND);
    }

    // Validate file size and type if image provided
    if (command.image) {
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (command.image.size > maxSize) {
        throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
          fileType: 'image',
          maxSize: '20MB',
        });
      }
      const allowedTypes = /(jpg|jpeg|png|webp)$/i;
      if (!allowedTypes.test(command.image.mimetype)) {
        throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
          allowedTypes: 'jpg, jpeg, png, webp',
        });
      }
    }

    // Store old file URL for cleanup
    const oldImageUrl = existingGifticon.imageUrl;

    // Upload new image before transaction
    let imageUrl: string | undefined;
    if (command.image) {
      const result = await this.uploadService.uploadImage(command.image, {
        folder: 'gifticons',
      });
      imageUrl = result.relativePath;
    } else if (command.deleteImage) {
      imageUrl = null;
    }

    // Update gifticon within transaction
    try {
      const gifticon = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const gifticonRepo = manager.getRepository(Gifticon);

          const gifticon = await gifticonRepo.findOne({
            where: { id: command.gifticonId, deletedAt: null },
          });

          if (!gifticon) {
            throw notFound(MessageKeys.GIFTICON_NOT_FOUND);
          }

          // Validate dates
          if (command.startsAt && command.endsAt) {
            if (command.startsAt >= command.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          } else if (command.startsAt && gifticon.endsAt) {
            if (command.startsAt >= gifticon.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          } else if (command.endsAt && gifticon.startsAt) {
            if (gifticon.startsAt >= command.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          }

          // Check slug uniqueness if provided
          if (command.slug && command.slug !== gifticon.slug) {
            const existing = await gifticonRepo.findOne({
              where: { slug: command.slug, deletedAt: null },
            });
            if (existing) {
              throw badRequest(MessageKeys.SLUG_ALREADY_EXISTS);
            }
          }

          // Update gifticon fields
          if (command.title !== undefined) gifticon.title = command.title;
          if (command.slug !== undefined) gifticon.slug = command.slug || null;
          if (command.summary !== undefined) gifticon.summary = command.summary || null;
          if (command.content !== undefined) gifticon.content = command.content;
          if (command.status !== undefined) gifticon.status = command.status;
          if (command.startsAt !== undefined)
            gifticon.startsAt = command.startsAt || null;
          if (command.endsAt !== undefined) gifticon.endsAt = command.endsAt || null;
          if (imageUrl !== undefined) gifticon.imageUrl = imageUrl;
          if (command.amount !== undefined) gifticon.amount = command.amount;
          if (command.typeColor !== undefined)
            gifticon.typeColor = command.typeColor || null;

          await gifticonRepo.save(gifticon);

          // Reload
          const reloaded = await gifticonRepo.findOne({
            where: { id: gifticon.id },
          });

          if (!reloaded) {
            throw notFound(MessageKeys.GIFTICON_NOT_FOUND_AFTER_UPDATE);
          }

          return reloaded;
        },
      );

      // Delete old file after successful update (best effort, asynchronously)
      if ((imageUrl !== undefined || command.deleteImage) && oldImageUrl) {
        Promise.allSettled([this.uploadService.deleteFile(oldImageUrl)]).catch(() => {
          // Ignore cleanup errors
        });
      }

      return gifticon;
    } catch (transactionError) {
      // If transaction fails, cleanup newly uploaded file (best effort)
      if (imageUrl) {
        await this.uploadService.deleteFile(imageUrl).catch(() => {
          // Ignore cleanup errors
        });
      }
      throw transactionError;
    }
  }
}

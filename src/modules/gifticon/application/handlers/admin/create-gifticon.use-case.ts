import { Injectable, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CreateGifticonCommand {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  status?: GifticonStatus;
  startsAt?: Date;
  endsAt?: Date;
  image?: MulterFile;
  amount: number;
  typeColor?: string;
}

@Injectable()
export class CreateGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateGifticonCommand): Promise<Gifticon> {
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

    // Generate gifticon ID first
    const gifticonId = randomUUID();

    // Upload image before transaction
    let imageUrl: string | undefined;
    if (command.image) {
      const result = await this.uploadService.uploadImage(command.image, {
        folder: 'gifticons',
      });
      imageUrl = result.relativePath;
    }

    // Create gifticon within transaction
    try {
      const gifticon = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const gifticonRepo = manager.getRepository(Gifticon);

          // Generate slug if not provided
          let slug = command.slug;
          if (!slug) {
            slug = this.generateSlug(command.title);
            // Ensure uniqueness
            let counter = 1;
            let uniqueSlug = slug;
            while (
              await gifticonRepo.findOne({
                where: { slug: uniqueSlug, deletedAt: null },
              })
            ) {
              uniqueSlug = `${slug}-${counter}`;
              counter++;
            }
            slug = uniqueSlug;
          } else {
            // Check if slug already exists
            const existing = await gifticonRepo.findOne({
              where: { slug, deletedAt: null },
            });
            if (existing) {
              throw badRequest(MessageKeys.SLUG_ALREADY_EXISTS);
            }
          }

          // Validate dates
          if (command.startsAt && command.endsAt) {
            if (command.startsAt >= command.endsAt) {
              throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
            }
          }

          // Create gifticon
          const gifticonEntity = gifticonRepo.create({
            id: gifticonId,
            title: command.title,
            slug,
            summary: command.summary,
            content: command.content,
            status: command.status || GifticonStatus.DRAFT,
            startsAt: command.startsAt,
            endsAt: command.endsAt,
            imageUrl,
            amount: command.amount,
            typeColor: command.typeColor,
          });

          return gifticonRepo.save(gifticonEntity);
        },
      );
      return gifticon;
    } catch (transactionError) {
      // If transaction fails, cleanup uploaded file (best effort)
      if (imageUrl) {
        await this.uploadService.deleteFile(imageUrl).catch(() => {
          // Ignore cleanup errors
        });
      }
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

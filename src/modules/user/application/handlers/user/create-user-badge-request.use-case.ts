import { Injectable, Inject } from '@nestjs/common';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import { IUserBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/user-badge-request.repository';
import { IUserBadgeRequestImageRepository } from '../../../infrastructure/persistence/repositories/user-badge-request-image.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import { IBadgeRepository } from '../../../../badge/infrastructure/persistence/repositories/badge.repository';
import { BadgeType } from '../../../../badge/domain/entities/badge.entity';
import { UploadService } from '../../../../../shared/services/upload/upload.service';
import { MulterFile } from '../../../../../shared/services/upload';
import {
  badRequest,
  conflict,
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CreateUserBadgeRequestCommand {
  userId: string;
  badgeId: string;
  content?: string;
  images?: MulterFile[];
}

@Injectable()
export class CreateUserBadgeRequestUseCase {
  constructor(
    @Inject('IUserBadgeRequestRepository')
    private readonly badgeRequestRepository: IUserBadgeRequestRepository,
    @Inject('IUserBadgeRequestImageRepository')
    private readonly badgeRequestImageRepository: IUserBadgeRequestImageRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateUserBadgeRequestCommand): Promise<UserBadgeRequest> {
    // Validate badge exists, is active, not deleted, and has type USER
    const badge = await this.badgeRepository.findByIdIncludingDeleted(command.badgeId);
    if (!badge) {
      throw notFound(MessageKeys.BADGE_NOT_FOUND);
    }
    if (badge.deletedAt) {
      throw badRequest(MessageKeys.BADGE_ALREADY_DELETED);
    }
    if (!badge.isActive) {
      throw badRequest(MessageKeys.BADGE_NOT_AVAILABLE);
    }
    if (badge.badgeType !== BadgeType.USER) {
      throw badRequest(MessageKeys.BADGE_WRONG_TYPE);
    }

    // Check if user already has this badge
    const hasBadge = await this.userBadgeRepository.hasBadge(command.userId, command.badgeId);
    if (hasBadge) {
      throw conflict(MessageKeys.BADGE_ALREADY_ASSIGNED_TO_USER);
    }

    // Check if there's already a pending request for this badge
    const existingPending = await this.badgeRequestRepository.findPendingByUserAndBadge(
      command.userId,
      command.badgeId,
    );
    if (existingPending) {
      throw conflict(MessageKeys.PENDING_BADGE_REQUEST_EXISTS);
    }

    // Validate images
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.images && command.images.length > 0) {
      if (command.images.length > 5) {
        throw badRequest(MessageKeys.MAX_IMAGES_PER_COMMENT_EXCEEDED, { maxImages: 5 });
      }
      for (let i = 0; i < command.images.length; i++) {
        const image = command.images[i];
        if (image.size > maxSize) {
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, { maxSize: '20MB' });
        }
        if (!allowedTypes.test(image.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
      }
    }

    // Upload images before creating request
    const uploadedImageUrls: string[] = [];
    if (command.images && command.images.length > 0) {
      for (const image of command.images) {
        const uploadResult = await this.uploadService.uploadImage(image, {
          folder: 'user-badge-requests',
        });
        uploadedImageUrls.push(uploadResult.relativePath);
      }
    }

    // Create request
    const request = await this.badgeRequestRepository.create({
      userId: command.userId,
      badgeId: command.badgeId,
      status: UserBadgeRequestStatus.PENDING,
      content: command.content,
    });

    // Create images
    if (uploadedImageUrls.length > 0) {
      const imageEntities = uploadedImageUrls.map((url, index) => ({
        requestId: request.id,
        imageUrl: url,
        order: index + 1,
      }));
      await this.badgeRequestImageRepository.createMany(imageEntities);
    }

    // Reload with relations
    const reloaded = await this.badgeRequestRepository.findById(request.id, [
      'user',
      'badge',
      'images',
    ]);

    if (!reloaded) {
      throw notFound(MessageKeys.USER_BADGE_REQUEST_NOT_FOUND_AFTER_CREATE);
    }

    return reloaded;
  }
}

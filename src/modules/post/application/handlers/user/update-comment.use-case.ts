import { Injectable, Inject } from '@nestjs/common';
import { PostComment } from '../../../domain/entities/post-comment.entity';
import { PostCommentImage } from '../../../domain/entities/post-comment-image.entity';
import { IPostCommentRepository } from '../../../infrastructure/persistence/repositories/post-comment.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { EntityManager } from 'typeorm';
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateCommentCommand {
  commentId: string;
  userId: string;
  content?: string;
  deleteImageIds?: string[];
  images?: MulterFile[];
}

@Injectable()
export class UpdateCommentUseCase {
  constructor(
    @Inject('IPostCommentRepository')
    private readonly commentRepository: IPostCommentRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateCommentCommand): Promise<PostComment> {
    const comment = await this.commentRepository.findById(command.commentId, [
      'images',
      'user',
    ]);

    if (!comment) {
      throw notFound(MessageKeys.COMMENT_NOT_FOUND);
    }

    // Check ownership
    if (comment.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_UPDATE_OWN_COMMENTS);
    }

    // Validate images
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;

    // Get current images count
    const currentImageCount = comment.images?.length || 0;
    const deleteCount = command.deleteImageIds?.length || 0;
    const newImageCount = command.images?.length || 0;
    const finalImageCount = currentImageCount - deleteCount + newImageCount;

    if (finalImageCount > 5) {
      throw badRequest(MessageKeys.MAX_IMAGES_PER_COMMENT_EXCEEDED, {
        maxImages: 5,
      });
    }

    if (command.images) {
      for (let i = 0; i < command.images.length; i++) {
        const image = command.images[i];
        if (image.size > maxSize) {
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
            maxSize: '20MB',
          });
        }
        if (!allowedTypes.test(image.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
      }
    }

    // Validate deleteImageIds belong to this comment
    if (command.deleteImageIds && command.deleteImageIds.length > 0) {
      const existingImageIds = (comment.images || []).map((img) => img.id);
      const invalidIds = command.deleteImageIds.filter(
        (id) => !existingImageIds.includes(id),
      );
      if (invalidIds.length > 0) {
        throw badRequest(MessageKeys.COMMENT_IMAGE_NOT_FOUND);
      }
    }

    // Upload new images before transaction
    const uploadedImageUrls: string[] = [];
    if (command.images && command.images.length > 0) {
      for (const image of command.images) {
        const uploadResult = await this.uploadService.uploadImage(image, {
          folder: 'post-comments',
        });
        uploadedImageUrls.push(uploadResult.relativePath);
      }
    }

    // Update comment within transaction
    try {
      const result = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const commentRepo = manager.getRepository(PostComment);
          const imageRepo = manager.getRepository(PostCommentImage);

          // Update content if provided
          if (command.content !== undefined) {
            await commentRepo.update(command.commentId, {
              content: command.content,
            });
          }

          // Delete images if provided
          if (command.deleteImageIds && command.deleteImageIds.length > 0) {
            const imagesToDelete = await imageRepo.find({
              where: command.deleteImageIds.map((id) => ({ id })),
            });

            // Delete files from storage
            for (const image of imagesToDelete) {
              await this.uploadService.deleteFile(image.imageUrl);
            }

            // Delete from database
            await imageRepo.delete(command.deleteImageIds);
          }

          // Add new images if provided
          if (uploadedImageUrls.length > 0) {
            // Get current max order
            const existingImages = await imageRepo.find({
              where: { commentId: command.commentId },
              order: { order: 'DESC' },
              take: 1,
            });
            const maxOrder = existingImages.length > 0 ? existingImages[0].order : -1;

            const imageEntities = uploadedImageUrls.map((imageUrl, index) =>
              imageRepo.create({
                commentId: command.commentId,
                imageUrl,
                order: maxOrder + 1 + index,
              }),
            );
            await imageRepo.save(imageEntities);
          }

          // Reload with images and user
          const reloaded = await commentRepo.findOne({
            where: { id: command.commentId },
            relations: ['images', 'user', 'user.userBadges', 'user.userBadges.badge'],
          });

          if (!reloaded) {
            throw notFound(MessageKeys.COMMENT_NOT_FOUND_AFTER_UPDATE);
          }

          return reloaded;
        },
      );

      return result;
    } catch (transactionError) {
      // Cleanup uploaded files if transaction fails
      const cleanupPromises = uploadedImageUrls.map((url) =>
        this.uploadService.deleteFile(url),
      );
      await Promise.allSettled(cleanupPromises);
      throw transactionError;
    }
  }
}

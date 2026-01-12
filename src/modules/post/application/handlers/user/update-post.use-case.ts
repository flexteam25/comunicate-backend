import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import {
  notFound,
  forbidden,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdatePostCommand {
  postId: string;
  userId: string;
  categoryId?: string;
  title?: string;
  content?: string;
  thumbnail?: MulterFile;
  deleteThumbnail?: boolean | 'true' | 'false';
  isPinned?: boolean;
}

@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdatePostCommand): Promise<Post> {
    // Get existing post first
    const existingPost = await this.postRepository.findById(command.postId);
    if (!existingPost) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    // Check ownership
    if (existingPost.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_UPDATE_OWN_POSTS);
    }

    // Check time limit: can only edit within 1 hour after creation
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in milliseconds
    if (existingPost.createdAt < oneHourAgo) {
      throw forbidden(MessageKeys.CAN_ONLY_EDIT_POSTS_WITHIN_ONE_HOUR);
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (command.thumbnail && command.thumbnail.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
        fileType: 'thumbnail',
        maxSize: '20MB',
      });
    }

    // Validate file type
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.thumbnail && !allowedTypes.test(command.thumbnail.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }

    // Store old thumbnail URL for cleanup
    const oldThumbnailUrl = existingPost.thumbnailUrl;

    // Upload new thumbnail before transaction
    let thumbnailUrl: string | undefined | null;
    if (command.thumbnail) {
      try {
        const result = await this.uploadService.uploadImage(command.thumbnail, {
          folder: 'posts/thumbnails',
        });
        thumbnailUrl = result.relativePath;
      } catch (error) {
        throw badRequest(MessageKeys.UPLOAD_FAILED, {
          error: (error as Error).message,
        });
      }
    } else if (command.deleteThumbnail === true || command.deleteThumbnail === 'true') {
      thumbnailUrl = null;
    }

    // Update post within transaction
    try {
      return await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const postRepo = manager.getRepository(Post);

          // Validate category if provided
          if (command.categoryId) {
            const category = await this.categoryRepository.findById(command.categoryId);
            if (!category) {
              throw notFound(MessageKeys.CATEGORY_NOT_FOUND);
            }

            if (category.specialKey !== null) {
              throw badRequest(MessageKeys.CANNOT_UPDATE_POST_TO_SPECIAL_KEY_CATEGORY);
            }
          }

          // Check for duplicate title if title is being updated
          if (command.title) {
            const duplicatePost = await this.postRepository.findByTitle(
              command.title,
              command.postId,
            );
            if (duplicatePost) {
              throw badRequest(MessageKeys.POST_TITLE_ALREADY_EXISTS);
            }
          }

          const updateData: Partial<Post> = {};
          if (command.categoryId !== undefined)
            updateData.categoryId = command.categoryId;
          if (command.title !== undefined) updateData.title = command.title;
          if (command.content !== undefined) updateData.content = command.content;
          if (
            command.thumbnail !== undefined ||
            command.deleteThumbnail === true ||
            command.deleteThumbnail === 'true'
          ) {
            updateData.thumbnailUrl = thumbnailUrl;
          }
          // Users cannot change isPublished or isPinned via user API
          if (command.isPinned !== undefined) updateData.isPinned = command.isPinned;

          await postRepo.update(command.postId, updateData);

          const updated = await postRepo.findOne({
            where: { id: command.postId },
            relations: [
              'user',
              'user.userBadges',
              'user.userBadges.badge',
              'admin',
              'category',
            ],
          });

          if (!updated) {
            throw notFound(MessageKeys.POST_NOT_FOUND_AFTER_UPDATE);
          }

          return updated;
        },
      );
    } catch (error) {
      // Cleanup: Delete newly uploaded thumbnail if transaction fails
      if (thumbnailUrl && command.thumbnail) {
        try {
          await this.uploadService.deleteFile(thumbnailUrl);
        } catch (deleteError) {
          // Log but don't throw - best effort cleanup
          console.error(
            'Failed to cleanup thumbnail after transaction failure:',
            deleteError,
          );
        }
      }
      throw error;
    } finally {
      // Delete old thumbnail file after successful transaction (best effort, async)
      if (
        oldThumbnailUrl &&
        (command.thumbnail ||
          command.deleteThumbnail === true ||
          command.deleteThumbnail === 'true')
      ) {
        this.uploadService.deleteFile(oldThumbnailUrl).catch((error) => {
          console.error('Failed to delete old thumbnail:', error);
        });
      }
    }
  }
}

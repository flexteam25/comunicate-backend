import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';

export interface UpdatePostCommand {
  postId: string;
  categoryId?: string;
  title?: string;
  content?: string;
  thumbnail?: MulterFile;
  deleteThumbnail?: boolean | string;
  isPublished?: boolean;
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
    // Get existing post first to check for old thumbnail
    const existingPost = await this.postRepository.findById(command.postId);
    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (command.thumbnail && command.thumbnail.size > maxSize) {
      throw new BadRequestException('Thumbnail file size exceeds 20MB');
    }

    // Validate file type
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.thumbnail && !allowedTypes.test(command.thumbnail.mimetype)) {
      throw new BadRequestException(
        'Invalid thumbnail file type. Allowed: jpg, jpeg, png, webp',
      );
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
        throw new BadRequestException(
          `Failed to upload thumbnail: ${(error as Error).message}`,
        );
      }
    } else if (command.deleteThumbnail === true || command.deleteThumbnail === 'true') {
      thumbnailUrl = null;
    }

    // Update post within transaction
    try {
      await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const postRepo = manager.getRepository(Post);

          // Validate category if provided
          if (command.categoryId) {
            const category = await this.categoryRepository.findById(command.categoryId);
            if (!category) {
              throw new NotFoundException('Category not found');
            }
          }

          // Check for duplicate title if title is being updated
          if (command.title) {
            const duplicatePost = await this.postRepository.findByTitle(
              command.title,
              command.postId,
            );
            if (duplicatePost) {
              throw new BadRequestException('A post with this title already exists');
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
          // Only admin can publish/unpublish posts (via admin API)
          if (command.isPublished !== undefined) {
            updateData.isPublished = command.isPublished;
            if (command.isPublished && !existingPost.publishedAt) {
              updateData.publishedAt = new Date();
            } else if (!command.isPublished) {
              updateData.publishedAt = null;
            }
          }
          if (command.isPinned !== undefined) updateData.isPinned = command.isPinned;

          await postRepo.update(command.postId, updateData);
        },
      );

      // Reload with aggregates after transaction commits
      const reloaded = await this.postRepository.findByIdWithAggregates(command.postId);
      if (!reloaded) {
        throw new NotFoundException('Post not found after update');
      }
      return reloaded;
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
      if (oldThumbnailUrl && (command.thumbnail || command.deleteThumbnail)) {
        this.uploadService.deleteFile(oldThumbnailUrl).catch((error) => {
          console.error('Failed to delete old thumbnail:', error);
        });
      }
    }
  }
}

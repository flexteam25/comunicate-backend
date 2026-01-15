import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';
import { badRequest, notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface CreatePostCommand {
  adminId: string; // Admin's ID
  categoryId: string;
  title: string;
  content: string;
  thumbnail?: MulterFile;
  isPinned?: boolean;
  isPublished?: boolean;
  isPointBanner?: boolean;
}

@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreatePostCommand): Promise<Post> {
    const category = await this.categoryRepository.findById(command.categoryId);
    if (!category) {
      throw badRequest(MessageKeys.CATEGORY_NOT_FOUND);
    }

    if (category.specialKey !== null) {
      throw badRequest(MessageKeys.CANNOT_CREATE_POST_WITH_SPECIAL_KEY_CATEGORY);
    }

    // Check for duplicate title
    const existingPost = await this.postRepository.findByTitle(command.title);
    if (existingPost) {
      throw badRequest(MessageKeys.POST_TITLE_ALREADY_EXISTS);
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

    // Generate post ID first
    const postId = randomUUID();

    // Upload thumbnail before transaction
    let thumbnailUrl: string | undefined;
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
    }

    // Transaction: Create post in database
    try {
      await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const postRepo = manager.getRepository(Post);

          const post = postRepo.create({
            id: postId,
            adminId: command.adminId,
            categoryId: command.categoryId,
            title: command.title,
            content: command.content,
            thumbnailUrl,
            isPublished: command.isPublished || false,
            isPinned: command.isPinned || false,
            isPointBanner: command.isPointBanner || false,
            publishedAt: command.isPublished ? new Date() : null,
          });

          await postRepo.save(post);
        },
      );

      // Reload with aggregates after transaction commits
      const reloaded = await this.postRepository.findByIdWithAggregates(postId);
      if (!reloaded) {
        throw notFound(MessageKeys.POST_NOT_FOUND_AFTER_CREATE);
      }
      return reloaded;
    } catch (error) {
      // Cleanup: Delete uploaded thumbnail if database transaction fails
      if (thumbnailUrl) {
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
    }
  }
}

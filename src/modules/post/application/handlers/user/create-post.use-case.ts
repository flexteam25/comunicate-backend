import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager, DataSource } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';
import {
  badRequest,
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { UserPost } from '../../../../user/domain/entities/user-post.entity';
import { customAlphabet } from 'nanoid';
import { PointRewardService } from '../../../../point/application/services/point-reward.service';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';

export interface CreatePostCommand {
  userId: string; // User's ID
  categoryId: string;
  title: string;
  content: string;
  thumbnail?: MulterFile;
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
    private readonly pointRewardService: PointRewardService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: CreatePostCommand): Promise<Post> {
    const category = await this.categoryRepository.findById(command.categoryId);
    if (!category) {
      throw badRequest(MessageKeys.CATEGORY_NOT_FOUND);
    }

    if (category.adminCreateOnly === true) {
      throw badRequest(MessageKeys.CANNOT_CREATE_POST_WITH_ADMIN_ONLY_CATEGORY);
    }

    if (category.specialKey !== null) {
      throw badRequest(MessageKeys.CANNOT_CREATE_POST_WITH_SPECIAL_KEY_CATEGORY);
    }

    // Check if user has enough points when category requires spending points
    if (category.point < 0) {
      const userProfileRepo = this.dataSource.getRepository(UserProfile);
      const userProfile = await userProfileRepo.findOne({
        where: { userId: command.userId },
      });
      const currentPoints = userProfile?.points ?? 0;
      const requiredPoints = Math.abs(category.point); // Convert negative to positive for comparison

      if (currentPoints < requiredPoints) {
        throw badRequest(MessageKeys.INSUFFICIENT_POINTS);
      }
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

    // Generate post ID and slug first
    const postId = randomUUID();
    const nanoid = customAlphabet(
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      8,
    );
    let slug = nanoid();

    // Ensure slug is unique (retry up to 3 times)
    let retries = 0;
    while (retries < 3) {
      const existingPost = await this.postRepository.findByIdOrSlug(slug);
      if (!existingPost) {
        break;
      }
      slug = nanoid();
      retries++;
    }

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
      return await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const postRepo = manager.getRepository(Post);

          const post = postRepo.create({
            id: postId,
            slug,
            userId: command.userId,
            categoryId: command.categoryId,
            title: command.title,
            content: command.content,
            thumbnailUrl,
            isPublished: command.isPublished || false,
            isPinned: false, // User posts cannot be pinned
            isPointBanner: command.isPointBanner || false,
            publishedAt: command.isPublished ? new Date() : null,
          });

          const savedPost = await postRepo.save(post);

          // Save to user_posts for statistics
          const userPostRepo = manager.getRepository(UserPost);
          const userPost = userPostRepo.create({
            userId: command.userId,
            postId: savedPost.id,
            createdAt: savedPost.createdAt,
            updatedAt: savedPost.updatedAt,
          });
          await userPostRepo.save(userPost);

          // Reward/deduct points based on category.point (only if point !== 0)
          // If category.point < 0, require sufficient points (will throw error if insufficient)
          if (category.point !== 0) {
            await this.pointRewardService.rewardPoints(manager, {
              userId: command.userId,
              pointSettingKey: 'post_category', // Dummy key, not used since we override with category.point
              category: 'post_creation',
              referenceType: 'post',
              referenceId: savedPost.id,
              overridePoints: category.point, // Use category.point instead of point_settings
              requireSufficientPoints: category.point < 0, // Require sufficient points when spending
              description: `게시글 작성: ${category.nameKo || category.name} (Post creation: ${category.name})`,
              descriptionKo: `게시글 작성: ${category.nameKo || category.name}`,
              metadata: {
                categoryId: category.id,
                categoryName: category.name,
                categoryNameKo: category.nameKo || null,
                postId: savedPost.id,
                pointFromCategory: category.point,
              },
            });
          }

          const reloaded = await postRepo.findOne({
            where: { id: savedPost.id },
            relations: [
              'user',
              'user.userBadges',
              'user.userBadges.badge',
              'admin',
              'category',
            ],
          });

          if (!reloaded) {
            throw notFound(MessageKeys.POST_NOT_FOUND_AFTER_CREATE);
          }

          return reloaded;
        },
      );
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

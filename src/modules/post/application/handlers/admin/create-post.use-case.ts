import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';

export interface CreatePostCommand {
  adminId: string; // Admin's ID
  categoryId: string;
  title: string;
  content: string;
  thumbnail?: MulterFile;
  isPinned?: boolean;
  isPublished?: boolean;
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
      throw new BadRequestException('Category not found');
    }

    // Check for duplicate title
    const existingPost = await this.postRepository.findByTitle(command.title);
    if (existingPost) {
      throw new BadRequestException('A post with this title already exists');
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
        throw new BadRequestException(
          `Failed to upload thumbnail: ${(error as Error).message}`,
        );
      }
    }

    // Transaction: Create post in database
    try {
      return await this.transactionService.executeInTransaction(
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
            publishedAt: command.isPublished ? new Date() : null,
          });

          const savedPost = await postRepo.save(post);

          const reloaded = await postRepo.findOne({
            where: { id: savedPost.id },
            relations: ['user', 'admin', 'category'],
          });

          if (!reloaded) {
            throw new Error('Failed to reload post after creation');
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

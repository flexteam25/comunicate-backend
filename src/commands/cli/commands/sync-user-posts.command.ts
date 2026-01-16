import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICommand } from '../base-command.interface';
import { UserPost } from '../../../modules/user/domain/entities/user-post.entity';
import { Post } from '../../../modules/post/domain/entities/post.entity';
import { LoggerService } from '../../../shared/logger/logger.service';

@Injectable()
export class SyncUserPostsCommand implements ICommand {
  signature = 'sync-user-posts';
  description = 'Sync user_posts table for a specific user';

  constructor(
    @InjectRepository(UserPost)
    private readonly userPostRepository: Repository<UserPost>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly logger: LoggerService,
  ) {}

  async handle(args: string[], options?: Record<string, unknown>): Promise<void> {
    const userId = (options?.userId as string) || args[0];

    if (!userId) {
      console.error('❌ Error: userId is required');
      console.log('\nUsage:');
      console.log('  npm run cli:dev -- sync-user-posts --userId=<user-id>');
      console.log('  npm run cli -- sync-user-posts --userId=<user-id>');
      process.exit(1);
    }

    try {
      // Get all posts for this user (including soft-deleted posts, excluding admin posts)
      const posts = await this.postRepository
        .createQueryBuilder('post')
        .withDeleted()
        .where('post.userId = :userId', { userId })
        .select([
          'post.id',
          'post.userId',
          'post.createdAt',
          'post.updatedAt',
          'post.deletedAt',
        ])
        .getMany();

      let createdCount = 0;
      let updatedCount = 0;
      let softDeletedCount = 0;

      // Process each post
      for (const post of posts) {
        // Try to find existing user_post record (including soft-deleted ones)
        const existingUserPost = await this.userPostRepository
          .createQueryBuilder('userPost')
          .withDeleted()
          .where('userPost.userId = :userId', { userId: post.userId })
          .andWhere('userPost.postId = :postId', { postId: post.id })
          .getOne();

        if (existingUserPost) {
          // Update existing record with post's created_at, updated_at, and deleted_at
          existingUserPost.createdAt = post.createdAt;
          existingUserPost.updatedAt = post.updatedAt;

          // If post is soft-deleted, soft delete user_posts
          if (post.deletedAt) {
            if (!existingUserPost.deletedAt) {
              // Post was deleted but user_posts wasn't - soft delete it
              await this.userPostRepository.softDelete(existingUserPost.id);
              softDeletedCount++;
            } else {
              // Both are deleted, just update timestamps
              existingUserPost.deletedAt = post.deletedAt;
              await this.userPostRepository.save(existingUserPost);
            }
          } else {
            // Post is not deleted
            if (existingUserPost.deletedAt) {
              // Post was restored but user_posts wasn't - restore it
              await this.userPostRepository.restore(existingUserPost.id);
              // After restore, we need to reload to get the updated entity
              const restored = await this.userPostRepository.findOne({
                where: { id: existingUserPost.id },
              });
              if (restored) {
                restored.createdAt = post.createdAt;
                restored.updatedAt = post.updatedAt;
                await this.userPostRepository.save(restored);
              }
            } else {
              // Both are active, just update timestamps
              await this.userPostRepository.save(existingUserPost);
            }
          }
          updatedCount++;
        } else {
          // Create new record
          const userPost = this.userPostRepository.create({
            userId: post.userId,
            postId: post.id,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            deletedAt: post.deletedAt || null, // Set deleted_at if post is deleted
          });
          await this.userPostRepository.save(userPost);
          createdCount++;

          // If post is soft-deleted, also soft delete the user_posts record
          if (post.deletedAt) {
            await this.userPostRepository.softDelete(userPost.id);
            softDeletedCount++;
          }
        }
      }

      // Also handle case where user_posts exists but post no longer exists or was deleted
      // Soft delete user_posts records that don't have a corresponding active post
      const allUserPosts = await this.userPostRepository
        .createQueryBuilder('userPost')
        .withDeleted()
        .where('userPost.userId = :userId', { userId })
        .getMany();

      const currentPostIds = posts.map((p) => p.id);
      const orphanedUserPosts = allUserPosts.filter(
        (up) => !currentPostIds.includes(up.postId),
      );

      for (const orphaned of orphanedUserPosts) {
        if (!orphaned.deletedAt) {
          await this.userPostRepository.softDelete(orphaned.id);
          softDeletedCount++;
        }
      }

      const totalProcessed = createdCount + updatedCount;

      console.log(`✅ Sync completed successfully!`);
      console.log(`📊 Total posts found: ${posts.length}`);
      console.log(`➕ Created: ${createdCount}`);
      console.log(`🔄 Updated: ${updatedCount}`);
      console.log(`🗑️  Soft deleted: ${softDeletedCount}`);
      console.log(`📝 Total processed: ${totalProcessed}`);
    } catch (error) {
      this.logger.error(
        'Failed to sync user_posts',
        {
          userId,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'cli',
      );

      console.error(`❌ Failed to sync user_posts: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

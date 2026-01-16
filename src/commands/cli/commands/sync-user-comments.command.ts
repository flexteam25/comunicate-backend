import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICommand } from '../base-command.interface';
import { UserComment, CommentType } from '../../../modules/user/domain/entities/user-comment.entity';
import { PostComment } from '../../../modules/post/domain/entities/post-comment.entity';
import { SiteReviewComment } from '../../../modules/site-review/domain/entities/site-review-comment.entity';
import { ScamReportComment } from '../../../modules/scam-report/domain/entities/scam-report-comment.entity';
import { LoggerService } from '../../../shared/logger/logger.service';

@Injectable()
export class SyncUserCommentsCommand implements ICommand {
  signature = 'sync-user-comments';
  description = 'Sync user_comments table for a specific user from all comment sources';

  constructor(
    @InjectRepository(UserComment)
    private readonly userCommentRepository: Repository<UserComment>,
    @InjectRepository(PostComment)
    private readonly postCommentRepository: Repository<PostComment>,
    @InjectRepository(SiteReviewComment)
    private readonly siteReviewCommentRepository: Repository<SiteReviewComment>,
    @InjectRepository(ScamReportComment)
    private readonly scamReportCommentRepository: Repository<ScamReportComment>,
    private readonly logger: LoggerService,
  ) {}

  async handle(args: string[], options?: Record<string, unknown>): Promise<void> {
    const userId = (options?.userId as string) || args[0];

    if (!userId) {
      console.error('❌ Error: userId is required');
      console.log('\nUsage:');
      console.log('  npm run cli:dev -- sync-user-comments --userId=<user-id>');
      console.log('  npm run cli -- sync-user-comments --userId=<user-id>');
      process.exit(1);
    }

    try {
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSoftDeleted = 0;

      // 1. Sync POST_COMMENT
      const postComments = await this.postCommentRepository
        .createQueryBuilder('comment')
        .withDeleted()
        .where('comment.userId = :userId', { userId })
        .select([
          'comment.id',
          'comment.userId',
          'comment.createdAt',
          'comment.updatedAt',
          'comment.deletedAt',
        ])
        .getMany();

      const postCommentStats = await this.syncComments(
        postComments,
        CommentType.POST_COMMENT,
        userId,
      );
      totalCreated += postCommentStats.created;
      totalUpdated += postCommentStats.updated;
      totalSoftDeleted += postCommentStats.softDeleted;

      // 2. Sync SITE_REVIEW_COMMENT
      const siteReviewComments = await this.siteReviewCommentRepository
        .createQueryBuilder('comment')
        .withDeleted()
        .where('comment.userId = :userId', { userId })
        .select([
          'comment.id',
          'comment.userId',
          'comment.createdAt',
          'comment.updatedAt',
          'comment.deletedAt',
        ])
        .getMany();

      const siteReviewCommentStats = await this.syncComments(
        siteReviewComments,
        CommentType.SITE_REVIEW_COMMENT,
        userId,
      );
      totalCreated += siteReviewCommentStats.created;
      totalUpdated += siteReviewCommentStats.updated;
      totalSoftDeleted += siteReviewCommentStats.softDeleted;

      // 3. Sync SCAM_REPORT_COMMENT
      const scamReportComments = await this.scamReportCommentRepository
        .createQueryBuilder('comment')
        .withDeleted()
        .where('comment.userId = :userId', { userId })
        .select([
          'comment.id',
          'comment.userId',
          'comment.createdAt',
          'comment.updatedAt',
          'comment.deletedAt',
        ])
        .getMany();

      const scamReportCommentStats = await this.syncComments(
        scamReportComments,
        CommentType.SCAM_REPORT_COMMENT,
        userId,
      );
      totalCreated += scamReportCommentStats.created;
      totalUpdated += scamReportCommentStats.updated;
      totalSoftDeleted += scamReportCommentStats.softDeleted;

      // Clean up orphaned user_comments (comments that no longer exist)
      const allUserComments = await this.userCommentRepository
        .createQueryBuilder('userComment')
        .withDeleted()
        .where('userComment.userId = :userId', { userId })
        .getMany();

      const allCommentIds = new Set<string>();
      postComments.forEach((c) => allCommentIds.add(c.id));
      siteReviewComments.forEach((c) => allCommentIds.add(c.id));
      scamReportComments.forEach((c) => allCommentIds.add(c.id));

      const orphanedUserComments = allUserComments.filter(
        (uc) => !allCommentIds.has(uc.commentId),
      );

      for (const orphaned of orphanedUserComments) {
        if (!orphaned.deletedAt) {
          await this.userCommentRepository.softDelete(orphaned.id);
          totalSoftDeleted++;
        }
      }

      const totalProcessed = totalCreated + totalUpdated;
      const totalComments =
        postComments.length + siteReviewComments.length + scamReportComments.length;

      console.log(`✅ Sync completed successfully!`);
      console.log(`📊 Total comments found: ${totalComments}`);
      console.log(`   - Post comments: ${postComments.length}`);
      console.log(`   - Site review comments: ${siteReviewComments.length}`);
      console.log(`   - Scam report comments: ${scamReportComments.length}`);
      console.log(`➕ Created: ${totalCreated}`);
      console.log(`🔄 Updated: ${totalUpdated}`);
      console.log(`🗑️  Soft deleted: ${totalSoftDeleted}`);
      console.log(`📝 Total processed: ${totalProcessed}`);
    } catch (error) {
      this.logger.error(
        'Failed to sync user_comments',
        {
          userId,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'cli',
      );

      console.error(`❌ Failed to sync user_comments: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  private async syncComments(
    comments: Array<{
      id: string;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt?: Date;
    }>,
    commentType: CommentType,
    userId: string,
  ): Promise<{ created: number; updated: number; softDeleted: number }> {
    let created = 0;
    let updated = 0;
    let softDeleted = 0;

    for (const comment of comments) {
      // Try to find existing user_comment record (including soft-deleted ones)
      const existingUserComment = await this.userCommentRepository
        .createQueryBuilder('userComment')
        .withDeleted()
        .where('userComment.userId = :userId', { userId })
        .andWhere('userComment.commentId = :commentId', { commentId: comment.id })
        .andWhere('userComment.commentType = :commentType', { commentType })
        .getOne();

      if (existingUserComment) {
        // Update existing record with comment's created_at, updated_at, and deleted_at
        existingUserComment.createdAt = comment.createdAt;
        existingUserComment.updatedAt = comment.updatedAt;

        // If comment is soft-deleted, soft delete user_comments
        if (comment.deletedAt) {
          if (!existingUserComment.deletedAt) {
            // Comment was deleted but user_comments wasn't - soft delete it
            await this.userCommentRepository.softDelete(existingUserComment.id);
            softDeleted++;
          } else {
            // Both are deleted, just update timestamps
            existingUserComment.deletedAt = comment.deletedAt;
            await this.userCommentRepository.save(existingUserComment);
          }
        } else {
          // Comment is not deleted
          if (existingUserComment.deletedAt) {
            // Comment was restored but user_comments wasn't - restore it
            await this.userCommentRepository.restore(existingUserComment.id);
            // After restore, we need to reload to get the updated entity
            const restored = await this.userCommentRepository.findOne({
              where: { id: existingUserComment.id },
            });
            if (restored) {
              restored.createdAt = comment.createdAt;
              restored.updatedAt = comment.updatedAt;
              await this.userCommentRepository.save(restored);
            }
          } else {
            // Both are active, just update timestamps
            await this.userCommentRepository.save(existingUserComment);
          }
        }
        updated++;
      } else {
        // Create new record
        const userComment = this.userCommentRepository.create({
          userId: comment.userId,
          commentId: comment.id,
          commentType,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          deletedAt: comment.deletedAt || null, // Set deleted_at if comment is deleted
        });
        await this.userCommentRepository.save(userComment);
        created++;

        // If comment is soft-deleted, also soft delete the user_comments record
        if (comment.deletedAt) {
          await this.userCommentRepository.softDelete(userComment.id);
          softDeleted++;
        }
      }
    }

    return { created, updated, softDeleted };
  }
}

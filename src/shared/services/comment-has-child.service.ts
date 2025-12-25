import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostComment } from '../../modules/post/domain/entities/post-comment.entity';
import { SiteReviewComment } from '../../modules/site-review/domain/entities/site-review-comment.entity';
import { ScamReportComment } from '../../modules/scam-report/domain/entities/scam-report-comment.entity';

export enum CommentType {
  POST = 'post',
  SITE_REVIEW = 'site_review',
  SCAM_REPORT = 'scam_report',
}

@Injectable()
export class CommentHasChildService {
  constructor(
    @InjectRepository(PostComment)
    private readonly postCommentRepository: Repository<PostComment>,
    @InjectRepository(SiteReviewComment)
    private readonly siteReviewCommentRepository: Repository<SiteReviewComment>,
    @InjectRepository(ScamReportComment)
    private readonly scamReportCommentRepository: Repository<ScamReportComment>,
  ) {}

  /**
   * Update has_child flag for parent comment asynchronously
   * This method should be called without await to run in background
   */
  async updateHasChildAsync(
    commentType: CommentType,
    parentCommentId: string,
  ): Promise<void> {
    // Run asynchronously without blocking
    setImmediate(async () => {
      try {
        await this.updateHasChild(commentType, parentCommentId);
      } catch (error) {
        // Log error but don't throw to avoid breaking the main flow
        console.error(
          `Failed to update has_child for ${commentType} comment ${parentCommentId}:`,
          error,
        );
      }
    });
  }

  /**
   * Update has_child flag for parent comment
   */
  private async updateHasChild(
    commentType: CommentType,
    parentCommentId: string,
  ): Promise<void> {
    if (!parentCommentId) {
      return;
    }

    let hasChild = false;

    switch (commentType) {
      case CommentType.POST:
        // Check if parent comment exists and find one child
        const postChild = await this.postCommentRepository
          .createQueryBuilder('comment')
          .where('comment.parentCommentId = :parentCommentId', {
            parentCommentId,
          })
          .andWhere('comment.deletedAt IS NULL')
          .limit(1)
          .getOne();
        hasChild = !!postChild;

        // Update parent comment
        if (hasChild) {
          await this.postCommentRepository.update(parentCommentId, {
            hasChild: true,
          });
        } else {
          await this.postCommentRepository.update(parentCommentId, {
            hasChild: false,
          });
        }
        break;

      case CommentType.SITE_REVIEW:
        const siteReviewChild = await this.siteReviewCommentRepository
          .createQueryBuilder('comment')
          .where('comment.parentCommentId = :parentCommentId', {
            parentCommentId,
          })
          .andWhere('comment.deletedAt IS NULL')
          .limit(1)
          .getOne();
        hasChild = !!siteReviewChild;

        if (hasChild) {
          await this.siteReviewCommentRepository.update(parentCommentId, {
            hasChild: true,
          });
        } else {
          await this.siteReviewCommentRepository.update(parentCommentId, {
            hasChild: false,
          });
        }
        break;

      case CommentType.SCAM_REPORT:
        const scamReportChild = await this.scamReportCommentRepository
          .createQueryBuilder('comment')
          .where('comment.parentCommentId = :parentCommentId', {
            parentCommentId,
          })
          .andWhere('comment.deletedAt IS NULL')
          .limit(1)
          .getOne();
        hasChild = !!scamReportChild;

        if (hasChild) {
          await this.scamReportCommentRepository.update(parentCommentId, {
            hasChild: true,
          });
        } else {
          await this.scamReportCommentRepository.update(parentCommentId, {
            hasChild: false,
          });
        }
        break;
    }
  }
}

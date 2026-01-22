import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { ScamReportComment } from '../../domain/entities/scam-report-comment.entity';
import { ScamReportCommentImage } from '../../domain/entities/scam-report-comment-image.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { IScamReportCommentRepository } from '../../infrastructure/persistence/repositories/scam-report-comment.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import {
  CommentHasChildService,
  CommentType as CommentHasChildType,
} from '../../../../shared/services/comment-has-child.service';
import {
  UserComment,
  CommentType,
} from '../../../user/domain/entities/user-comment.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';
import { PointRewardService } from '../../../point/application/services/point-reward.service';

export interface AddCommentCommand {
  reportId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  images?: string[];
}

@Injectable()
export class AddCommentUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    @Inject('IScamReportCommentRepository')
    private readonly scamReportCommentRepository: IScamReportCommentRepository,
    private readonly transactionService: TransactionService,
    private readonly commentHasChildService: CommentHasChildService,
    private readonly pointRewardService: PointRewardService,
  ) {}

  async execute(command: AddCommentCommand): Promise<ScamReportComment> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw notFound(MessageKeys.SCAM_REPORT_NOT_FOUND);
    }

    // Public users can only comment on published reports
    // Owners and admins can comment on any status
    if (
      report.status !== ScamReportStatus.PUBLISHED &&
      report.userId !== command.userId
    ) {
      throw badRequest(MessageKeys.CAN_ONLY_COMMENT_ON_PUBLISHED_SCAM_REPORTS);
    }

    const result = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const commentRepo = manager.getRepository(ScamReportComment);
        const imageRepo = manager.getRepository(ScamReportCommentImage);
        const userCommentRepo = manager.getRepository(UserComment);

        // Create comment
        const comment = commentRepo.create({
          scamReportId: command.reportId,
          userId: command.userId,
          parentCommentId: command.parentCommentId,
          content: command.content,
        });

        const savedComment = await commentRepo.save(comment);

        // Save to user_comments for statistics
        const userComment = userCommentRepo.create({
          userId: command.userId,
          commentType: CommentType.SCAM_REPORT_COMMENT,
          commentId: savedComment.id,
        });
        await userCommentRepo.save(userComment);

        // Create images if provided
        if (command.images && command.images.length > 0) {
          const imageEntities = command.images.map((imageUrl, index) =>
            imageRepo.create({
              commentId: savedComment.id,
              imageUrl,
              order: index,
            }),
          );
          await imageRepo.save(imageEntities);
        }

        // Reward points for comment
        await this.pointRewardService.rewardPoints(manager, {
          userId: command.userId,
          pointSettingKey: 'comment_any_board',
          category: 'comment_any_board',
          referenceType: 'scam_report_comment',
          referenceId: savedComment.id,
          description: '댓글 작성 보상 (Comment reward)',
          descriptionKo: '댓글 작성 보상',
          metadata: {
            reportId: command.reportId,
            commentId: savedComment.id,
            commentType: 'SCAM_REPORT_COMMENT',
          },
        });

        // Reload with images
        return commentRepo.findOne({
          where: { id: savedComment.id },
          relations: ['images', 'user', 'user.userBadges.badge'],
        });
      },
    );

    // Update has_child for parent comment asynchronously
    if (result?.parentCommentId) {
      void this.commentHasChildService.updateHasChildAsync(
        CommentHasChildType.SCAM_REPORT,
        result.parentCommentId,
      );
    }

    return result;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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
  ) {}

  async execute(command: AddCommentCommand): Promise<ScamReportComment> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    // Public users can only comment on published reports
    // Owners and admins can comment on any status
    if (
      report.status !== ScamReportStatus.PUBLISHED &&
      report.userId !== command.userId
    ) {
      throw new BadRequestException('You can only comment on published scam reports');
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

        // Reload with images
        return commentRepo.findOne({
          where: { id: savedComment.id },
          relations: ['images', 'user'],
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

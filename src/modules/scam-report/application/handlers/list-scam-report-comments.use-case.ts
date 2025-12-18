import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { IScamReportCommentRepository } from '../../infrastructure/persistence/repositories/scam-report-comment.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';
import { ScamReportComment } from '../../domain/entities/scam-report-comment.entity';

export interface ListScamReportCommentsCommand {
  reportId: string;
  parentCommentId?: string | null;
  userId?: string;
  isAdmin?: boolean;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListScamReportCommentsUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    @Inject('IScamReportCommentRepository')
    private readonly scamReportCommentRepository: IScamReportCommentRepository,
  ) {}

  async execute(command: ListScamReportCommentsCommand): Promise<CursorPaginationResult<ScamReportComment>> {
    // Check if report exists and user has permission to view
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    // Public can only see comments of published reports
    if (!command.isAdmin && report.status !== ScamReportStatus.PUBLISHED) {
      // Owner can see comments of their own reports
      if (!command.userId || report.userId !== command.userId) {
        throw new ForbiddenException('Scam report is not available for viewing');
      }
    }

    // If requesting replies to a specific comment, verify the parent comment exists and is not deleted
    if (command.parentCommentId) {
      const parentComment = await this.scamReportCommentRepository.findById(command.parentCommentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found or has been deleted');
      }
      // Verify parent comment belongs to the same report
      if (parentComment.scamReportId !== command.reportId) {
        throw new BadRequestException('Parent comment does not belong to this scam report');
      }
    }

    // Get comments
    return this.scamReportCommentRepository.findByReportId(
      command.reportId,
      command.parentCommentId,
      command.cursor,
      command.limit,
    );
  }
}

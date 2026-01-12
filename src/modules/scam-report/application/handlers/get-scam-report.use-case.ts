import { Injectable, Inject } from '@nestjs/common';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface GetScamReportCommand {
  reportId: string;
  userId?: string;
  isAdmin?: boolean;
}

@Injectable()
export class GetScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
  ) {}

  async execute(command: GetScamReportCommand): Promise<ScamReport> {
    const report = await this.scamReportRepository.findById(command.reportId, [
      'images',
      'reactions',
      'user',
      'site',
      'admin',
      'user.userBadges',
      'user.userBadges.badge',
    ]);

    if (!report) {
      throw notFound(MessageKeys.SCAM_REPORT_NOT_FOUND);
    }

    // Public can only see published reports
    if (!command.isAdmin && report.status !== ScamReportStatus.PUBLISHED) {
      // Owner can see their own reports
      if (!command.userId || report.userId !== command.userId) {
        throw forbidden(MessageKeys.SCAM_REPORT_NOT_AVAILABLE_FOR_VIEWING);
      }
    }

    return report;
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';

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
    ]);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    // Public can only see published reports
    if (!command.isAdmin && report.status !== ScamReportStatus.PUBLISHED) {
      // Owner can see their own reports
      if (!command.userId || report.userId !== command.userId) {
        throw new ForbiddenException('Scam report is not available for viewing');
      }
    }

    return report;
  }
}

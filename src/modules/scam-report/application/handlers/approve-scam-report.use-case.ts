import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';

export interface ApproveScamReportCommand {
  reportId: string;
  adminId: string;
}

@Injectable()
export class ApproveScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
  ) {}

  async execute(command: ApproveScamReportCommand): Promise<ScamReport> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    if (report.status !== ScamReportStatus.PENDING) {
      throw new BadRequestException('Scam report has already been processed');
    }

    return this.scamReportRepository.update(command.reportId, {
      status: ScamReportStatus.PUBLISHED,
      adminId: command.adminId,
      reviewedAt: new Date(),
    });
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import {
  notFound,
  forbidden,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface DeleteScamReportCommand {
  reportId: string;
  userId: string;
}

@Injectable()
export class DeleteScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
  ) {}

  async execute(command: DeleteScamReportCommand): Promise<void> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw notFound(MessageKeys.SCAM_REPORT_NOT_FOUND);
    }

    if (report.userId !== command.userId) {
      throw forbidden(MessageKeys.NO_PERMISSION_TO_DELETE_SCAM_REPORT);
    }

    if (report.status !== ScamReportStatus.PENDING) {
      throw badRequest(MessageKeys.ONLY_PENDING_SCAM_REPORTS_CAN_BE_DELETED);
    }

    await this.scamReportRepository.delete(command.reportId);
  }
}

import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';

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
      throw new NotFoundException('Scam report not found');
    }

    if (report.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own scam reports');
    }

    if (report.status !== ScamReportStatus.PENDING) {
      throw new BadRequestException('You can only delete pending scam reports');
    }

    await this.scamReportRepository.delete(command.reportId);
  }
}

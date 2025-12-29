import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';

export interface AdminDeleteScamReportCommand {
  reportId: string;
}

@Injectable()
export class AdminDeleteScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
  ) {}

  async execute(command: AdminDeleteScamReportCommand): Promise<void> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    // Soft delete (comments and reactions are kept as per requirements)
    await this.scamReportRepository.delete(command.reportId);
  }
}

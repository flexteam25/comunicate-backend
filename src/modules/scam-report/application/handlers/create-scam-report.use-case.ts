import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { ScamReportImage } from '../../domain/entities/scam-report-image.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';

export interface CreateScamReportCommand {
  userId: string;
  siteId?: string;
  siteUrl: string;
  siteName: string;
  siteAccountInfo: string;
  registrationUrl: string;
  contact: string;
  title: string;
  description: string;
  amount?: number;
  images?: string[];
}

@Injectable()
export class CreateScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateScamReportCommand): Promise<ScamReport> {
    // Validate site exists if siteId provided
    if (command.siteId) {
      const site = await this.siteRepository.findById(command.siteId);
      if (!site) {
        throw new BadRequestException('Site not found');
      }
    }

    // Create report and images within transaction
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reportRepo = manager.getRepository(ScamReport);
        const imageRepo = manager.getRepository(ScamReportImage);

        // Create scam report (siteId is stored directly in scam_reports.site_id)
        const report = reportRepo.create({
          userId: command.userId,
          siteId: command.siteId,
          siteUrl: command.siteUrl,
          siteName: command.siteName,
          siteAccountInfo: command.siteAccountInfo,
          registrationUrl: command.registrationUrl,
          contact: command.contact,
          title: command.title,
          description: command.description,
          amount: command.amount,
          status: ScamReportStatus.PENDING,
        });

        const savedReport = await reportRepo.save(report);

        // Create images if provided
        if (command.images && command.images.length > 0) {
          const imageEntities = command.images.map((imageUrl, index) =>
            imageRepo.create({
              scamReportId: savedReport.id,
              imageUrl,
              order: index,
            }),
          );
          await imageRepo.save(imageEntities);
        }

        // Reload with images
        const reloaded = await reportRepo.findOne({
          where: { id: savedReport.id },
          relations: ['images', 'user', 'site'],
        });

        if (!reloaded) {
          throw new Error('Failed to reload scam report after creation');
        }

        return reloaded;
      },
    );
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { ScamReportImage } from '../../domain/entities/scam-report-image.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import {
  badRequest,
  notFound,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface AdminCreateScamReportCommand {
  adminId: string;
  siteId?: string;
  title: string;
  siteUrl: string;
  siteName: string;
  siteAccountInfo: string;
  registrationUrl: string;
  contact: string;
  description: string;
  amount?: number;
  status?: ScamReportStatus;
  images?: string[];
}

@Injectable()
export class AdminCreateScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: AdminCreateScamReportCommand): Promise<ScamReport> {
    // Validate site exists if siteId provided
    if (command.siteId) {
      const site = await this.siteRepository.findById(command.siteId);
      if (!site) {
        throw badRequest(MessageKeys.SITE_NOT_FOUND);
      }
    }

    // Create report and images within transaction
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reportRepo = manager.getRepository(ScamReport);
        const imageRepo = manager.getRepository(ScamReportImage);

        // Create scam report with adminId and status (default to pending if not provided)
        // Note: userId is not set for admin-created reports
        const report = reportRepo.create({
          siteId: command.siteId,
          title: command.title,
          siteUrl: command.siteUrl,
          siteName: command.siteName,
          siteAccountInfo: command.siteAccountInfo,
          registrationUrl: command.registrationUrl,
          contact: command.contact,
          description: command.description,
          amount: command.amount,
          status: command.status || ScamReportStatus.PENDING,
          adminId: command.adminId,
          reviewedAt: new Date(), // Set reviewedAt when admin creates
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
          relations: ['images', 'user', 'site', 'admin'],
        });

        if (!reloaded) {
          throw notFound(MessageKeys.SCAM_REPORT_NOT_FOUND_AFTER_UPDATE);
        }

        return reloaded;
      },
    );
  }
}

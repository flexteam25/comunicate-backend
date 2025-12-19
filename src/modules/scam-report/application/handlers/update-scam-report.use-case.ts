import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { ScamReportImage } from '../../domain/entities/scam-report-image.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { IScamReportImageRepository } from '../../infrastructure/persistence/repositories/scam-report-image.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';

export interface UpdateScamReportCommand {
  reportId: string;
  userId: string;
  title?: string;
  description?: string;
  amount?: number;
  images?: string[];
}

@Injectable()
export class UpdateScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    @Inject('IScamReportImageRepository')
    private readonly scamReportImageRepository: IScamReportImageRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateScamReportCommand): Promise<ScamReport> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    if (report.userId !== command.userId) {
      throw new ForbiddenException('You can only update your own scam reports');
    }

    if (report.status !== ScamReportStatus.PENDING) {
      throw new BadRequestException('You can only update pending scam reports');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reportRepo = manager.getRepository(ScamReport);
        const imageRepo = manager.getRepository(ScamReportImage);

        // Update report fields
        const updateData: Partial<ScamReport> = {};
        if (command.title !== undefined) updateData.title = command.title;
        if (command.description !== undefined)
          updateData.description = command.description;
        if (command.amount !== undefined) updateData.amount = command.amount;

        if (Object.keys(updateData).length > 0) {
          await reportRepo.update(command.reportId, updateData);
        }

        // Replace images if provided
        if (command.images !== undefined) {
          // Delete existing images
          await imageRepo.delete({ scamReportId: command.reportId });

          // Create new images
          if (command.images.length > 0) {
            const imageEntities = command.images.map((imageUrl, index) =>
              imageRepo.create({
                scamReportId: command.reportId,
                imageUrl,
                order: index,
              }),
            );
            await imageRepo.save(imageEntities);
          }
        }

        // Reload with images
        return reportRepo.findOne({
          where: { id: command.reportId },
          relations: ['images', 'user', 'site'],
        });
      },
    );
  }
}

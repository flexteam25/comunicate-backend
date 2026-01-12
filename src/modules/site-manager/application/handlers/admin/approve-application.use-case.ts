import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';
import { SiteManager } from '../../../domain/entities/site-manager.entity';
import { SiteManagerRole } from '../../../domain/entities/site-manager.entity';
import { ISiteManagerApplicationRepository } from '../../../infrastructure/persistence/repositories/site-manager-application.repository';
import { ISiteManagerRepository } from '../../../infrastructure/persistence/repositories/site-manager.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface ApproveApplicationCommand {
  applicationId: string;
  adminId: string;
}

@Injectable()
export class ApproveApplicationUseCase {
  constructor(
    @Inject('ISiteManagerApplicationRepository')
    private readonly applicationRepository: ISiteManagerApplicationRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ApproveApplicationCommand): Promise<SiteManagerApplication> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const appRepo = manager.getRepository(SiteManagerApplication);
        const managerRepo = manager.getRepository(SiteManager);

        // Lock application row with pessimistic lock
        const application = await appRepo
          .createQueryBuilder('app')
          .where('app.id = :id', { id: command.applicationId })
          .setLock('pessimistic_write')
          .getOne();

        if (!application) {
          throw notFound(MessageKeys.APPLICATION_NOT_FOUND);
        }

        // Check status is pending
        if (application.status !== SiteManagerApplicationStatus.PENDING) {
          throw badRequest(MessageKeys.APPLICATION_ALREADY_PROCESSED);
        }

        // Double-check user is NOT already manager (handle race condition)
        const existingManager = await managerRepo.findOne({
          where: {
            siteId: application.siteId,
            userId: application.userId,
            isActive: true,
          },
        });

        if (existingManager) {
          throw badRequest(MessageKeys.USER_ALREADY_MANAGER_FOR_SITE);
        }

        // Update application
        application.status = SiteManagerApplicationStatus.APPROVED;
        application.adminId = command.adminId;
        application.reviewedAt = new Date();
        await appRepo.save(application);

        // Create SiteManager record
        const siteManager = managerRepo.create({
          siteId: application.siteId,
          userId: application.userId,
          role: SiteManagerRole.MANAGER,
          isActive: true,
        });
        await managerRepo.save(siteManager);

        // Reload with relations
        const reloaded = await appRepo.findOne({
          where: { id: application.id },
          relations: ['site', 'user', 'admin'],
        });

        if (!reloaded) {
          throw new Error('Failed to reload application after approval');
        }

        return reloaded;
      },
    );
  }
}

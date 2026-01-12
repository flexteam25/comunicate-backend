import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { SiteDomain } from '../../../domain/entities/site-domain.entity';
import { Site } from '../../../domain/entities/site.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface AddSiteDomainCommand {
  siteId: string;
  domain: string;
  isActive?: boolean;
  isCurrent?: boolean;
}

@Injectable()
export class AddSiteDomainUseCase {
  constructor(private readonly transactionService: TransactionService) {}

  async execute(command: AddSiteDomainCommand): Promise<SiteDomain> {
    const normalizedDomain = command.domain.trim().toLowerCase();

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const siteRepo = manager.getRepository(Site);
        const domainRepo = manager.getRepository(SiteDomain);

        const site = await siteRepo.findOne({
          where: { id: command.siteId, deletedAt: null },
        });
        if (!site) {
          throw notFound(MessageKeys.SITE_NOT_FOUND);
        }

        // Uniqueness across all sites
        const existingDomain = await domainRepo.findOne({
          where: { domain: normalizedDomain },
          withDeleted: true,
        });
        if (existingDomain) {
          throw badRequest(MessageKeys.DOMAIN_ALREADY_EXISTS);
        }

        // If set as current, unset other currents
        if (command.isCurrent) {
          await domainRepo
            .createQueryBuilder()
            .update(SiteDomain)
            .set({ isCurrent: false })
            .where('site_id = :siteId', { siteId: command.siteId })
            .execute();
        }

        const entity = domainRepo.create({
          siteId: command.siteId,
          domain: normalizedDomain,
          isActive: command.isActive ?? true,
          isCurrent: command.isCurrent ?? false,
        });
        return domainRepo.save(entity);
      },
    );
  }
}

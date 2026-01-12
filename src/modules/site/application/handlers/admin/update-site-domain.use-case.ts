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

export interface UpdateSiteDomainCommand {
  siteId: string;
  domainId: string;
  domain?: string;
  isActive?: boolean;
  isCurrent?: boolean;
}

@Injectable()
export class UpdateSiteDomainUseCase {
  constructor(private readonly transactionService: TransactionService) {}

  async execute(command: UpdateSiteDomainCommand): Promise<SiteDomain> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const siteRepo = manager.getRepository(Site);
        const domainRepo = manager.getRepository(SiteDomain);

        // Ensure site exists
        const site = await siteRepo.findOne({
          where: { id: command.siteId, deletedAt: null },
        });
        if (!site) {
          throw notFound(MessageKeys.SITE_NOT_FOUND);
        }

        // Load domain
        const domainEntity = await domainRepo.findOne({
          where: { id: command.domainId, siteId: command.siteId },
          withDeleted: false,
        });
        if (!domainEntity) {
          throw notFound(MessageKeys.DOMAIN_NOT_FOUND);
        }

        // Domain change uniqueness
        if (
          command.domain &&
          command.domain.trim().toLowerCase() !== domainEntity.domain
        ) {
          const normalized = command.domain.trim().toLowerCase();
          const existingDomain = await domainRepo.findOne({
            where: { domain: normalized },
            withDeleted: true,
          });
          if (existingDomain) {
            throw badRequest(MessageKeys.DOMAIN_ALREADY_EXISTS);
          }
          domainEntity.domain = normalized;
        }

        // isActive
        if (command.isActive !== undefined) {
          domainEntity.isActive = command.isActive;
        }

        // isCurrent: if true, unset others
        if (command.isCurrent !== undefined) {
          domainEntity.isCurrent = command.isCurrent;
          if (command.isCurrent) {
            await domainRepo
              .createQueryBuilder()
              .update(SiteDomain)
              .set({ isCurrent: false })
              .where('site_id = :siteId', { siteId: command.siteId })
              .andWhere('id != :id', { id: command.domainId })
              .execute();
          }
        }

        await domainRepo.save(domainEntity);
        return domainEntity;
      },
    );
  }
}

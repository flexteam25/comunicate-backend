import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { SiteDomain } from '../../../domain/entities/site-domain.entity';
import { Site } from '../../../domain/entities/site.entity';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteSiteDomainCommand {
  siteId: string;
  domainId: string;
}

@Injectable()
export class DeleteSiteDomainUseCase {
  constructor(private readonly transactionService: TransactionService) {}

  async execute(command: DeleteSiteDomainCommand): Promise<void> {
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const siteRepo = manager.getRepository(Site);
      const domainRepo = manager.getRepository(SiteDomain);

      const site = await siteRepo.findOne({
        where: { id: command.siteId, deletedAt: null },
      });
      if (!site) {
        throw notFound(MessageKeys.SITE_NOT_FOUND);
      }

      const domain = await domainRepo.findOne({
        where: { id: command.domainId, siteId: command.siteId },
      });
      if (!domain) {
        throw notFound(MessageKeys.DOMAIN_NOT_FOUND);
      }

      await domainRepo.delete(command.domainId);
    });
  }
}

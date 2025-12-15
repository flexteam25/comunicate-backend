import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Site } from '../../../domain/entities/site.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';

export interface RestoreSiteCommand {
  siteId: string;
}

@Injectable()
export class RestoreSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RestoreSiteCommand): Promise<Site> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const siteRepo = manager.getRepository(Site);

        const site = await siteRepo.findOne({
          where: { id: command.siteId },
          withDeleted: true,
        });
        if (!site) {
          throw new NotFoundException('Site not found');
        }

        if (!site.deletedAt) {
          throw new BadRequestException('Site is not deleted');
        }

        await siteRepo.restore(command.siteId);

        const restored = await siteRepo.findOne({
          where: { id: command.siteId, deletedAt: null },
        });
        if (!restored) {
          throw new NotFoundException('Site not found after restore');
        }
        return restored;
      },
    );
  }
}

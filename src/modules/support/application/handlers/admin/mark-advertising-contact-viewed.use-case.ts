import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IAdvertisingContactRepository } from '../../../infrastructure/persistence/repositories/advertising-contact.repository';
import { AdvertisingContact } from '../../../domain/entities/advertising-contact.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface MarkAdvertisingContactViewedCommand {
  advertisingContactId: string;
  adminId: string;
}

@Injectable()
export class MarkAdvertisingContactViewedUseCase {
  constructor(
    @Inject('IAdvertisingContactRepository')
    private readonly advertisingContactRepository: IAdvertisingContactRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(
    command: MarkAdvertisingContactViewedCommand,
  ): Promise<AdvertisingContact> {
    // Check if advertising contact exists
    const advertisingContact = await this.advertisingContactRepository.findById(
      command.advertisingContactId,
    );
    if (!advertisingContact) {
      throw new NotFoundException('Advertising contact not found');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const advertisingContactRepo = manager.getRepository(AdvertisingContact);

        advertisingContact.isViewed = true;
        advertisingContact.viewedByAdminId = command.adminId;
        advertisingContact.viewedAt = new Date();

        return advertisingContactRepo.save(advertisingContact);
      },
    );
  }
}

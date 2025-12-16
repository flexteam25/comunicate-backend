import { Injectable, Inject } from '@nestjs/common';
import { IAdvertisingContactRepository } from '../../../infrastructure/persistence/repositories/advertising-contact.repository';
import { AdvertisingContact } from '../../../domain/entities/advertising-contact.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateAdvertisingContactCommand {
  userId: string;
  message: string;
  images?: string[];
}

@Injectable()
export class CreateAdvertisingContactUseCase {
  constructor(
    @Inject('IAdvertisingContactRepository')
    private readonly advertisingContactRepository: IAdvertisingContactRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateAdvertisingContactCommand): Promise<AdvertisingContact> {
    return this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const advertisingContactRepo = manager.getRepository(AdvertisingContact);

      const advertisingContact = advertisingContactRepo.create({
        userId: command.userId,
        message: command.message,
        images: command.images || [],
        isViewed: false,
      });

      return advertisingContactRepo.save(advertisingContact);
    });
  }
}


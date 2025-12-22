import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';

export interface UpdateGifticonCommand {
  gifticonId: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  status?: GifticonStatus;
  startsAt?: Date;
  endsAt?: Date;
  imageUrl?: string;
  amount?: number;
}

@Injectable()
export class UpdateGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateGifticonCommand): Promise<Gifticon> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const gifticonRepo = manager.getRepository(Gifticon);

        const gifticon = await gifticonRepo.findOne({
          where: { id: command.gifticonId, deletedAt: null },
        });

        if (!gifticon) {
          throw new NotFoundException('Gifticon not found');
        }

        // Validate dates
        if (command.startsAt && command.endsAt) {
          if (command.startsAt >= command.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        } else if (command.startsAt && gifticon.endsAt) {
          if (command.startsAt >= gifticon.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        } else if (command.endsAt && gifticon.startsAt) {
          if (gifticon.startsAt >= command.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        }

        // Check slug uniqueness if provided
        if (command.slug && command.slug !== gifticon.slug) {
          const existing = await gifticonRepo.findOne({
            where: { slug: command.slug, deletedAt: null },
          });
          if (existing) {
            throw new BadRequestException('Slug already exists');
          }
        }

        // Update gifticon fields
        if (command.title !== undefined) gifticon.title = command.title;
        if (command.slug !== undefined) gifticon.slug = command.slug || null;
        if (command.summary !== undefined) gifticon.summary = command.summary || null;
        if (command.content !== undefined) gifticon.content = command.content;
        if (command.status !== undefined) gifticon.status = command.status;
        if (command.startsAt !== undefined) gifticon.startsAt = command.startsAt || null;
        if (command.endsAt !== undefined) gifticon.endsAt = command.endsAt || null;
        if (command.imageUrl !== undefined) gifticon.imageUrl = command.imageUrl || null;
        if (command.amount !== undefined) gifticon.amount = command.amount;

        await gifticonRepo.save(gifticon);

        // Reload
        const reloaded = await gifticonRepo.findOne({
          where: { id: gifticon.id },
        });

        if (!reloaded) {
          throw new Error('Failed to reload gifticon after update');
        }

        return reloaded;
      },
    );
  }
}

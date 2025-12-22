import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { PocaEventBanner } from '../../../domain/entities/poca-event-banner.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';

export interface UpdatePocaEventCommand {
  eventId: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  status?: PocaEventStatus;
  startsAt?: Date;
  endsAt?: Date;
  primaryBannerUrl?: string;
  banners?: Array<{ imageUrl: string; order: number }>;
}

@Injectable()
export class UpdatePocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdatePocaEventCommand): Promise<PocaEvent> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const eventRepo = manager.getRepository(PocaEvent);
        const bannerRepo = manager.getRepository(PocaEventBanner);

        const event = await eventRepo.findOne({
          where: { id: command.eventId, deletedAt: null },
        });

        if (!event) {
          throw new NotFoundException('Event not found');
        }

        // Validate dates
        if (command.startsAt && command.endsAt) {
          if (command.startsAt >= command.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        } else if (command.startsAt && event.endsAt) {
          if (command.startsAt >= event.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        } else if (command.endsAt && event.startsAt) {
          if (event.startsAt >= command.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        }

        // Check slug uniqueness if provided
        if (command.slug && command.slug !== event.slug) {
          const existing = await eventRepo.findOne({
            where: { slug: command.slug, deletedAt: null },
          });
          if (existing) {
            throw new BadRequestException('Slug already exists');
          }
        }

        // Update event fields
        if (command.title !== undefined) event.title = command.title;
        if (command.slug !== undefined) event.slug = command.slug || null;
        if (command.summary !== undefined) event.summary = command.summary || null;
        if (command.content !== undefined) event.content = command.content;
        if (command.status !== undefined) event.status = command.status;
        if (command.startsAt !== undefined) event.startsAt = command.startsAt || null;
        if (command.endsAt !== undefined) event.endsAt = command.endsAt || null;
        if (command.primaryBannerUrl !== undefined)
          event.primaryBannerUrl = command.primaryBannerUrl || null;

        await eventRepo.save(event);

        // Replace banners if provided
        if (command.banners !== undefined) {
          // Delete existing banners
          await bannerRepo.delete({ eventId: event.id });

          // Create new banners
          if (command.banners.length > 0) {
            const banners = command.banners.map((b) =>
              bannerRepo.create({
                eventId: event.id,
                imageUrl: b.imageUrl,
                order: b.order,
              }),
            );
            await bannerRepo.save(banners);
          }
        }

        // Reload with relations
        const reloaded = await eventRepo.findOne({
          where: { id: event.id },
          relations: ['banners'],
          order: { banners: { order: 'ASC' } },
        });

        if (!reloaded) {
          throw new Error('Failed to reload event after update');
        }

        return reloaded;
      },
    );
  }
}

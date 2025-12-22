import {
  Injectable,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { PocaEventBanner } from '../../../domain/entities/poca-event-banner.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';

export interface CreatePocaEventCommand {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  status?: PocaEventStatus;
  startsAt?: Date;
  endsAt?: Date;
  primaryBannerUrl?: string;
  banners?: Array<{ imageUrl: string; order: number }>;
}

@Injectable()
export class CreatePocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreatePocaEventCommand): Promise<PocaEvent> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const eventRepo = manager.getRepository(PocaEvent);
        const bannerRepo = manager.getRepository(PocaEventBanner);

        // Generate slug if not provided
        let slug = command.slug;
        if (!slug) {
          slug = this.generateSlug(command.title);
          // Ensure uniqueness
          let counter = 1;
          let uniqueSlug = slug;
          while (
            await eventRepo.findOne({
              where: { slug: uniqueSlug, deletedAt: null },
            })
          ) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
          }
          slug = uniqueSlug;
        } else {
          // Check if slug already exists
          const existing = await eventRepo.findOne({
            where: { slug, deletedAt: null },
          });
          if (existing) {
            throw new BadRequestException('Slug already exists');
          }
        }

        // Validate dates
        if (command.startsAt && command.endsAt) {
          if (command.startsAt >= command.endsAt) {
            throw new BadRequestException(
              'Start date must be before end date',
            );
          }
        }

        // Create event
        const event = eventRepo.create({
          title: command.title,
          slug,
          summary: command.summary,
          content: command.content,
          status: command.status || PocaEventStatus.DRAFT,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          primaryBannerUrl: command.primaryBannerUrl,
          viewCount: 0,
        });

        const savedEvent = await eventRepo.save(event);

        // Create banners if provided
        if (command.banners && command.banners.length > 0) {
          const banners = command.banners.map((b) =>
            bannerRepo.create({
              eventId: savedEvent.id,
              imageUrl: b.imageUrl,
              order: b.order,
            }),
          );
          await bannerRepo.save(banners);
        }

        // Reload with relations
        const reloaded = await eventRepo.findOne({
          where: { id: savedEvent.id },
          relations: ['banners'],
          order: { banners: { order: 'ASC' } },
        });

        if (!reloaded) {
          throw new Error('Failed to reload event after creation');
        }

        return reloaded;
      },
    );
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

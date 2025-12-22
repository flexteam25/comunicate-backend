import {
  Injectable,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';

export interface CreateGifticonCommand {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  status?: GifticonStatus;
  startsAt?: Date;
  endsAt?: Date;
  imageUrl?: string;
  amount: number;
}

@Injectable()
export class CreateGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateGifticonCommand): Promise<Gifticon> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const gifticonRepo = manager.getRepository(Gifticon);

        // Generate slug if not provided
        let slug = command.slug;
        if (!slug) {
          slug = this.generateSlug(command.title);
          // Ensure uniqueness
          let counter = 1;
          let uniqueSlug = slug;
          while (
            await gifticonRepo.findOne({
              where: { slug: uniqueSlug, deletedAt: null },
            })
          ) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
          }
          slug = uniqueSlug;
        } else {
          // Check if slug already exists
          const existing = await gifticonRepo.findOne({
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

        // Create gifticon
        const gifticon = gifticonRepo.create({
          title: command.title,
          slug,
          summary: command.summary,
          content: command.content,
          status: command.status || GifticonStatus.DRAFT,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          imageUrl: command.imageUrl,
          amount: command.amount,
        });

        return gifticonRepo.save(gifticon);
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

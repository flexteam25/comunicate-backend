import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewReactionRepository } from '../../infrastructure/persistence/repositories/site-review-reaction.repository';
import {
  SiteReviewReaction,
  ReactionType,
} from '../../domain/entities/site-review-reaction.entity';
import { SiteReviewCacheService } from '../../infrastructure/cache/site-review-cache.service';

export interface ReactToSiteReviewCommand {
  reviewId: string;
  userId: string;
  reactionType: ReactionType;
}

@Injectable()
export class ReactToSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteReviewReactionRepository')
    private readonly reactionRepository: ISiteReviewReactionRepository,
    private readonly siteReviewCacheService: SiteReviewCacheService,
  ) {}

  async execute(command: ReactToSiteReviewCommand): Promise<SiteReviewReaction> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw new NotFoundException('Site review not found');
    }

    const existingReaction = await this.reactionRepository.findByReviewIdAndUserId(
      command.reviewId,
      command.userId,
    );

    let result: SiteReviewReaction;
    const todayDate = this.siteReviewCacheService.getTodayDate();
    
    if (existingReaction) {
      if (existingReaction.reactionType === command.reactionType) {
        // Same reaction type - remove (toggle off)
        // Cache the date when the reaction was created (timezone +9)
        const reactionDateObj = new Date(existingReaction.createdAt);
        const koreaDate = new Date(reactionDateObj.getTime() + 9 * 60 * 60 * 1000);
        const year = koreaDate.getUTCFullYear();
        const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(koreaDate.getUTCDate()).padStart(2, '0');
        const reactionDate = `${year}-${month}-${day}`;
        await this.siteReviewCacheService.addSiteDate(review.siteId, reactionDate);
        
        await this.reactionRepository.delete(existingReaction.id);
        result = existingReaction;
      } else {
        // Different reaction type - update (switch like/dislike)
        // Cache today's date
        await this.siteReviewCacheService.addSiteDate(review.siteId, todayDate);
        
        result = await this.reactionRepository.update(existingReaction.id, {
          reactionType: command.reactionType,
        });
      }
    } else {
      // Create new reaction - cache today's date
      await this.siteReviewCacheService.addSiteDate(review.siteId, todayDate);
      
      result = await this.reactionRepository.create({
        siteReviewId: command.reviewId,
        userId: command.userId,
        reactionType: command.reactionType,
      });
    }

    return result;
  }
}

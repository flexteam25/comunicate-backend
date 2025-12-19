import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ISiteReviewRepository } from '../../../infrastructure/persistence/repositories/site-review.repository';
import { SiteReview } from '../../../domain/entities/site-review.entity';

export interface RejectSiteReviewCommand {
  reviewId: string;
}

@Injectable()
export class RejectSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(command: RejectSiteReviewCommand): Promise<SiteReview> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw new NotFoundException('Site review not found');
    }

    if (!review.isPublished) {
      throw new BadRequestException('Site review has not been approved');
    }

    await this.siteReviewRepository.update(command.reviewId, {
      isPublished: false,
    });

    // Recalculate site statistics
    const reviewRepoImpl = this.siteReviewRepository as any;
    if (reviewRepoImpl.recalculateSiteStatistics) {
      await reviewRepoImpl.recalculateSiteStatistics(review.siteId);
    }

    // Reload with relations
    const reloaded = await this.siteReviewRepository.findById(command.reviewId, [
      'user',
      'site',
    ]);

    if (!reloaded) {
      throw new NotFoundException('Site review not found after update');
    }

    return reloaded;
  }
}

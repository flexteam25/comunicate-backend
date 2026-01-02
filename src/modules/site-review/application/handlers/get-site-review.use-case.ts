import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { SiteReview } from '../../domain/entities/site-review.entity';

export interface GetSiteReviewCommand {
  reviewId: string;
}

@Injectable()
export class GetSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(command: GetSiteReviewCommand): Promise<SiteReview> {
    const review = await this.siteReviewRepository.findById(command.reviewId, [
      'user',
      'site',
      'images',
      'user.userBadges',
      'user.userBadges.badge',
    ]);

    if (!review) {
      throw new NotFoundException('Site review not found');
    }

    return review;
  }
}

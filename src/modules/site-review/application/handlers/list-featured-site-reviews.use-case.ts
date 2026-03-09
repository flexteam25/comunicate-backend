import { Inject, Injectable } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { SiteReview } from '../../domain/entities/site-review.entity';

const DEFAULT_LIMIT = 6;

@Injectable()
export class ListFeaturedSiteReviewsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(): Promise<SiteReview[]> {
    return this.siteReviewRepository.findRecentHighRatingDistinctSiteReviews(DEFAULT_LIMIT);
  }
}

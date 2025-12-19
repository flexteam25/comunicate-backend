import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';

export interface DeleteSiteReviewCommand {
  reviewId: string;
  userId: string;
}

@Injectable()
export class DeleteSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(command: DeleteSiteReviewCommand): Promise<void> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw new NotFoundException('Site review not found');
    }

    if (review.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.siteReviewRepository.delete(command.reviewId);

    // Recalculate site statistics (reactions and comments remain, they're fine to keep)
    const reviewRepoImpl = this.siteReviewRepository as any;
    if (reviewRepoImpl.recalculateSiteStatistics) {
      await reviewRepoImpl.recalculateSiteStatistics(review.siteId);
    }
  }
}

import { Module } from '@nestjs/common';
import { SiteReviewPersistenceModule } from './site-review-persistence.module';
import { SitePersistenceModule } from '../site/site-persistence.module';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UploadModule } from '../../shared/services/upload/upload.module';
import { CreateSiteReviewUseCase } from './application/handlers/create-site-review.use-case';
import { UpdateSiteReviewUseCase } from './application/handlers/update-site-review.use-case';
import { DeleteSiteReviewUseCase } from './application/handlers/delete-site-review.use-case';
import { ListSiteReviewsUseCase } from './application/handlers/list-site-reviews.use-case';
import { GetSiteReviewUseCase } from './application/handlers/get-site-review.use-case';
import { GetSiteReviewStatisticsUseCase } from './application/handlers/get-site-review-statistics.use-case';
import { ListMySiteReviewsUseCase } from './application/handlers/list-my-site-reviews.use-case';
import { ReactToSiteReviewUseCase } from './application/handlers/react-to-site-review.use-case';
import { AddCommentUseCase } from './application/handlers/add-comment.use-case';
import { DeleteCommentUseCase } from './application/handlers/delete-comment.use-case';
import { ListCommentsUseCase } from './application/handlers/list-comments.use-case';
import { ApproveSiteReviewUseCase } from './application/handlers/admin/approve-site-review.use-case';
import { RejectSiteReviewUseCase } from './application/handlers/admin/reject-site-review.use-case';
import { ListAllSiteReviewsUseCase } from './application/handlers/admin/list-all-site-reviews.use-case';
import { SiteReviewController } from './interface/rest/user/site-review.controller';
import { AdminSiteReviewController } from './interface/rest/admin/site-review.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';

@Module({
  imports: [
    SiteReviewPersistenceModule,
    SitePersistenceModule,
    UserTokenRepositoryModule,
    ServicesModule,
    AdminGuardsModule,
    UploadModule.register(),
  ],
  controllers: [SiteReviewController, AdminSiteReviewController],
  providers: [
    CreateSiteReviewUseCase,
    UpdateSiteReviewUseCase,
    DeleteSiteReviewUseCase,
    ListSiteReviewsUseCase,
    GetSiteReviewUseCase,
    GetSiteReviewStatisticsUseCase,
    ListMySiteReviewsUseCase,
    ReactToSiteReviewUseCase,
    AddCommentUseCase,
    DeleteCommentUseCase,
    ListCommentsUseCase,
    ApproveSiteReviewUseCase,
    RejectSiteReviewUseCase,
    ListAllSiteReviewsUseCase,
  ],
  exports: [],
})
export class SiteReviewModule {}

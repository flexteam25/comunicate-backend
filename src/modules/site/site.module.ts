import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateSiteUseCase } from './application/handlers/admin/create-site.use-case';
import { UpdateSiteUseCase } from './application/handlers/admin/update-site.use-case';
import { DeleteSiteUseCase } from './application/handlers/admin/delete-site.use-case';
import { ListSitesUseCase as AdminListSitesUseCase } from './application/handlers/admin/list-sites.use-case';
import { ListTrashSitesUseCase } from './application/handlers/admin/list-trash-sites.use-case';
import { GetSiteUseCase as AdminGetSiteUseCase } from './application/handlers/admin/get-site.use-case';
import { AssignBadgeToSiteUseCase } from './application/handlers/admin/assign-badge.use-case';
import { RemoveBadgeFromSiteUseCase } from './application/handlers/admin/remove-badge.use-case';
import { ListSitesUseCase as UserListSitesUseCase } from './application/handlers/user/list-sites.use-case';
import { GetSiteUseCase as UserGetSiteUseCase } from './application/handlers/user/get-site.use-case';
import { AdminSiteController } from './interface/rest/admin/site.controller';
import { AdminCategoryController } from './interface/rest/admin/category.controller';
import { UserSiteController } from './interface/rest/user/site.controller';
import { CreateCategoryUseCase } from './application/handlers/admin/create-category.use-case';
import { UpdateCategoryUseCase } from './application/handlers/admin/update-category.use-case';
import { DeleteCategoryUseCase } from './application/handlers/admin/delete-category.use-case';
import { ListCategoriesUseCase } from './application/handlers/admin/list-categories.use-case';
import { ListCategoriesUseCase as UserListCategoriesUseCase } from './application/handlers/user/list-categories.use-case';
import { RestoreCategoryUseCase } from './application/handlers/admin/restore-category.use-case';
import { ListTrashCategoriesUseCase } from './application/handlers/admin/list-trash-categories.use-case';
import { RestoreSiteUseCase } from './application/handlers/admin/restore-site.use-case';
import { AddSiteDomainUseCase } from './application/handlers/admin/add-site-domain.use-case';
import { UpdateSiteDomainUseCase } from './application/handlers/admin/update-site-domain.use-case';
import { DeleteSiteDomainUseCase } from './application/handlers/admin/delete-site-domain.use-case';
import { CreatePartnerSiteUseCase } from './application/handlers/partner/create-partner-site.use-case';
import { CreateBadgeRequestUseCase } from './application/handlers/user/create-badge-request.use-case';
import { ListBadgeRequestsUseCase } from './application/handlers/user/list-badge-requests.use-case';
import { CancelBadgeRequestUseCase } from './application/handlers/user/cancel-badge-request.use-case';
import { ListAllBadgeRequestsUseCase } from './application/handlers/admin/list-all-badge-requests.use-case';
import { ApproveBadgeRequestUseCase } from './application/handlers/admin/approve-badge-request.use-case';
import { RejectBadgeRequestUseCase } from './application/handlers/admin/reject-badge-request.use-case';
import { ListSiteBadgesUseCase } from './application/handlers/user/list-site-badges.use-case';
import { BadgeRequestController } from './interface/rest/user/badge-request.controller';
import { Module } from '@nestjs/common';
import { TierModule } from '../tier/tier.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';
import { SitePersistenceModule } from './site-persistence.module';
import { UserHistorySitePersistenceModule } from '../user/user-history-site-persistence.module';
import { UserSearchSitePersistenceModule } from '../user/user-search-site-persistence.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { OptionalJwtAuthGuard } from '../../shared/guards/optional-jwt-auth.guard';
import { ScamReportModule } from '../scam-report/scam-report.module';
import { SiteManagerPersistenceModule } from '../site-manager/site-manager-persistence.module';
import { PartnerSiteController } from './interface/rest/partner/partner-site.controller';
import { RedisModule } from '../../shared/redis/redis.module';
import { LoggerModule } from '../../shared/logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [
    TypeOrmModule,
    SitePersistenceModule,
    SiteManagerPersistenceModule,
    TierModule,
    AdminGuardsModule,
    UserHistorySitePersistenceModule,
    UserSearchSitePersistenceModule,
    UserPersistenceModule,
    AuthPersistenceModule,
    UploadModule.register({ storageType: 'local' }),
    ScamReportModule,
    RedisModule,
    LoggerModule,
    ConfigModule,
    BadgeModule,
  ],
  providers: [
    CreateSiteUseCase,
    UpdateSiteUseCase,
    DeleteSiteUseCase,
    AdminListSitesUseCase,
    AdminGetSiteUseCase,
    ListTrashSitesUseCase,
    AssignBadgeToSiteUseCase,
    RemoveBadgeFromSiteUseCase,
    AddSiteDomainUseCase,
    UpdateSiteDomainUseCase,
    DeleteSiteDomainUseCase,
    UserListSitesUseCase,
    UserGetSiteUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
    UserListCategoriesUseCase,
    RestoreCategoryUseCase,
    ListTrashCategoriesUseCase,
    RestoreSiteUseCase,
    CreatePartnerSiteUseCase,
    CreateBadgeRequestUseCase,
    ListBadgeRequestsUseCase,
    CancelBadgeRequestUseCase,
    ListAllBadgeRequestsUseCase,
    ApproveBadgeRequestUseCase,
    RejectBadgeRequestUseCase,
    ListSiteBadgesUseCase,
    OptionalJwtAuthGuard,
  ],
  controllers: [
    AdminSiteController,
    AdminCategoryController,
    UserSiteController,
    PartnerSiteController,
    BadgeRequestController,
  ],
  exports: [SitePersistenceModule],
})
export class SiteModule {}

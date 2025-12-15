import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './domain/entities/site.entity';
import { SiteCategory } from './domain/entities/site-category.entity';
import { SiteBadge } from './domain/entities/site-badge.entity';
import { SiteDomain } from './domain/entities/site-domain.entity';
import { SiteView } from './domain/entities/site-view.entity';
import { SiteRepository } from './infrastructure/persistence/typeorm/site.repository';
import { SiteCategoryRepository } from './infrastructure/persistence/typeorm/site-category.repository';
import { SiteBadgeRepository } from './infrastructure/persistence/typeorm/site-badge.repository';
import { SiteDomainRepository } from './infrastructure/persistence/typeorm/site-domain.repository';
import { SiteViewRepository } from './infrastructure/persistence/typeorm/site-view.repository';
import { CreateSiteUseCase } from './application/handlers/admin/create-site.use-case';
import { UpdateSiteUseCase } from './application/handlers/admin/update-site.use-case';
import { DeleteSiteUseCase } from './application/handlers/admin/delete-site.use-case';
import { ListSitesUseCase as AdminListSitesUseCase } from './application/handlers/admin/list-sites.use-case';
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
import { RestoreCategoryUseCase } from './application/handlers/admin/restore-category.use-case';
import { RestoreSiteUseCase } from './application/handlers/admin/restore-site.use-case';
import { AddSiteDomainUseCase } from './application/handlers/admin/add-site-domain.use-case';
import { UpdateSiteDomainUseCase } from './application/handlers/admin/update-site-domain.use-case';
import { DeleteSiteDomainUseCase } from './application/handlers/admin/delete-site-domain.use-case';
import { Module, forwardRef } from '@nestjs/common';
import { TierModule } from '../tier/tier.module';
import { AdminModule } from '../admin/admin.module';
import { UploadModule } from '../../shared/services/upload';
import { Badge } from '../badge/domain/entities/badge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Site,
      SiteCategory,
      SiteBadge,
      SiteDomain,
      SiteView,
      Badge,
    ]),
    forwardRef(() => TierModule),
    AdminModule,
    UploadModule.register({ storageType: 'local' }),
  ],
  providers: [
    {
      provide: 'ISiteRepository',
      useClass: SiteRepository,
    },
    {
      provide: 'ISiteCategoryRepository',
      useClass: SiteCategoryRepository,
    },
    {
      provide: 'ISiteBadgeRepository',
      useClass: SiteBadgeRepository,
    },
    {
      provide: 'ISiteDomainRepository',
      useClass: SiteDomainRepository,
    },
    {
      provide: 'ISiteViewRepository',
      useClass: SiteViewRepository,
    },
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
    SiteDomainRepository,
    SiteViewRepository,
    CreateSiteUseCase,
    UpdateSiteUseCase,
    DeleteSiteUseCase,
    AdminListSitesUseCase,
    AdminGetSiteUseCase,
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
    RestoreCategoryUseCase,
    RestoreSiteUseCase,
  ],
  controllers: [AdminSiteController, AdminCategoryController, UserSiteController],
  exports: [
    'ISiteRepository',
    'ISiteCategoryRepository',
    'ISiteBadgeRepository',
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
  ],
})
export class SiteModule {}

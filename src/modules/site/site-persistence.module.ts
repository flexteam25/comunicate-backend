import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './domain/entities/site.entity';
import { SiteCategory } from './domain/entities/site-category.entity';
import { SiteBadge } from './domain/entities/site-badge.entity';
import { SiteDomain } from './domain/entities/site-domain.entity';
import { SiteView } from './domain/entities/site-view.entity';
import { SiteBadgeRequest } from './domain/entities/site-badge-request.entity';
import { Badge } from '../badge/domain/entities/badge.entity';
import { SiteRepository } from './infrastructure/persistence/typeorm/site.repository';
import { SiteCategoryRepository } from './infrastructure/persistence/typeorm/site-category.repository';
import { SiteBadgeRepository } from './infrastructure/persistence/typeorm/site-badge.repository';
import { SiteDomainRepository } from './infrastructure/persistence/typeorm/site-domain.repository';
import { SiteViewRepository } from './infrastructure/persistence/typeorm/site-view.repository';
import { SiteBadgeRequestRepository } from './infrastructure/persistence/typeorm/site-badge-request.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Site,
      SiteCategory,
      SiteBadge,
      SiteDomain,
      SiteView,
      SiteBadgeRequest,
      Badge,
    ]),
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
    {
      provide: 'ISiteBadgeRequestRepository',
      useClass: SiteBadgeRequestRepository,
    },
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
    SiteDomainRepository,
    SiteViewRepository,
    SiteBadgeRequestRepository,
  ],
  exports: [
    TypeOrmModule,
    'ISiteRepository',
    'ISiteCategoryRepository',
    'ISiteBadgeRepository',
    'ISiteDomainRepository',
    'ISiteViewRepository',
    'ISiteBadgeRequestRepository',
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
    SiteDomainRepository,
    SiteViewRepository,
    SiteBadgeRequestRepository,
  ],
})
export class SitePersistenceModule {}

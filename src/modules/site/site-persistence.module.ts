import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './domain/entities/site.entity';
import { SiteCategory } from './domain/entities/site-category.entity';
import { SiteBadge } from './domain/entities/site-badge.entity';
import { SiteDomain } from './domain/entities/site-domain.entity';
import { SiteView } from './domain/entities/site-view.entity';
import { SiteBadgeRequest } from './domain/entities/site-badge-request.entity';
import { SiteBadgeRequestImage } from './domain/entities/site-badge-request-image.entity';
import { Badge } from '../badge/domain/entities/badge.entity';
import { SiteRepository } from './infrastructure/persistence/typeorm/site.repository';
import { SiteCategoryRepository } from './infrastructure/persistence/typeorm/site-category.repository';
import { SiteBadgeRepository } from './infrastructure/persistence/typeorm/site-badge.repository';
import { SiteDomainRepository } from './infrastructure/persistence/typeorm/site-domain.repository';
import { SiteViewRepository } from './infrastructure/persistence/typeorm/site-view.repository';
import { SiteBadgeRequestRepository } from './infrastructure/persistence/typeorm/site-badge-request.repository';
import { SiteBadgeRequestImageRepository } from './infrastructure/persistence/typeorm/site-badge-request-image.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Site,
      SiteCategory,
      SiteBadge,
      SiteDomain,
      SiteView,
      SiteBadgeRequest,
      SiteBadgeRequestImage,
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
    {
      provide: 'ISiteBadgeRequestImageRepository',
      useClass: SiteBadgeRequestImageRepository,
    },
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
    SiteDomainRepository,
    SiteViewRepository,
    SiteBadgeRequestRepository,
    SiteBadgeRequestImageRepository,
  ],
  exports: [
    TypeOrmModule,
    'ISiteRepository',
    'ISiteCategoryRepository',
    'ISiteBadgeRepository',
    'ISiteDomainRepository',
    'ISiteViewRepository',
    'ISiteBadgeRequestRepository',
    'ISiteBadgeRequestImageRepository',
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
    SiteDomainRepository,
    SiteViewRepository,
    SiteBadgeRequestRepository,
    SiteBadgeRequestImageRepository,
  ],
})
export class SitePersistenceModule {}

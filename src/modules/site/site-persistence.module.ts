import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './domain/entities/site.entity';
import { SiteCategory } from './domain/entities/site-category.entity';
import { SiteBadge } from './domain/entities/site-badge.entity';
import { SiteDomain } from './domain/entities/site-domain.entity';
import { SiteView } from './domain/entities/site-view.entity';
import { Badge } from '../badge/domain/entities/badge.entity';
import { SiteRepository } from './infrastructure/persistence/typeorm/site.repository';
import { SiteCategoryRepository } from './infrastructure/persistence/typeorm/site-category.repository';
import { SiteBadgeRepository } from './infrastructure/persistence/typeorm/site-badge.repository';
import { SiteDomainRepository } from './infrastructure/persistence/typeorm/site-domain.repository';
import { SiteViewRepository } from './infrastructure/persistence/typeorm/site-view.repository';

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
  ],
  exports: [
    TypeOrmModule,
    'ISiteRepository',
    'ISiteCategoryRepository',
    'ISiteBadgeRepository',
    'ISiteDomainRepository',
    'ISiteViewRepository',
    SiteRepository,
    SiteCategoryRepository,
    SiteBadgeRepository,
    SiteDomainRepository,
    SiteViewRepository,
  ],
})
export class SitePersistenceModule {}

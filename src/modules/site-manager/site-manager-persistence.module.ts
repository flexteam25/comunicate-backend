import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteManager } from './domain/entities/site-manager.entity';
import { SiteManagerApplication } from './domain/entities/site-manager-application.entity';
import { SiteManagerRepository } from './infrastructure/persistence/typeorm/site-manager.repository';
import { SiteManagerApplicationRepository } from './infrastructure/persistence/typeorm/site-manager-application.repository';
import { SitePersistenceModule } from '../site/site-persistence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteManager, SiteManagerApplication]),
    forwardRef(() => SitePersistenceModule),
  ],
  exports: [
    TypeOrmModule,
    'ISiteManagerRepository',
    'ISiteManagerApplicationRepository',
    SiteManagerRepository,
    SiteManagerApplicationRepository,
  ],
  providers: [
    {
      provide: 'ISiteManagerRepository',
      useClass: SiteManagerRepository,
    },
    {
      provide: 'ISiteManagerApplicationRepository',
      useClass: SiteManagerApplicationRepository,
    },
    SiteManagerRepository,
    SiteManagerApplicationRepository,
  ],
})
export class SiteManagerPersistenceModule {}

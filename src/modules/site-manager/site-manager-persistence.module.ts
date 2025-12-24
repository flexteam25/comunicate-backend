import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteManager } from './domain/entities/site-manager.entity';
import { SiteManagerApplication } from './domain/entities/site-manager-application.entity';
import { SiteManagerRepository } from './infrastructure/persistence/typeorm/site-manager.repository';
import { SiteManagerApplicationRepository } from './infrastructure/persistence/typeorm/site-manager-application.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SiteManager, SiteManagerApplication])],
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

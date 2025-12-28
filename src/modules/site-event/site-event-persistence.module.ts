import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteEvent } from './domain/entities/site-event.entity';
import { SiteEventBanner } from './domain/entities/site-event-banner.entity';
import { SiteEventView } from './domain/entities/site-event-view.entity';
import { SiteEventRepository } from './infrastructure/persistence/typeorm/site-event.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SiteEvent, SiteEventBanner, SiteEventView])],
  exports: [TypeOrmModule, 'ISiteEventRepository', SiteEventRepository],
  providers: [
    {
      provide: 'ISiteEventRepository',
      useClass: SiteEventRepository,
    },
    SiteEventRepository,
  ],
})
export class SiteEventPersistenceModule {}

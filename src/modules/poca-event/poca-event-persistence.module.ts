import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PocaEvent } from './domain/entities/poca-event.entity';
import { PocaEventBanner } from './domain/entities/poca-event-banner.entity';
import { PocaEventView } from './domain/entities/poca-event-view.entity';
import { PocaEventRepository } from './infrastructure/persistence/typeorm/poca-event.repository';
import { PocaEventViewRepository } from './infrastructure/persistence/typeorm/poca-event-view.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([PocaEvent, PocaEventBanner, PocaEventView]),
  ],
  exports: [
    TypeOrmModule,
    'IPocaEventRepository',
    'IPocaEventViewRepository',
    PocaEventRepository,
    PocaEventViewRepository,
  ],
  providers: [
    {
      provide: 'IPocaEventRepository',
      useClass: PocaEventRepository,
    },
    {
      provide: 'IPocaEventViewRepository',
      useClass: PocaEventViewRepository,
    },
    PocaEventRepository,
    PocaEventViewRepository,
  ],
})
export class PocaEventPersistenceModule {}

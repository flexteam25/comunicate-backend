import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserHistorySite } from './domain/entities/user-history-site.entity';
import { UserHistorySiteRepository } from './infrastructure/persistence/typeorm/user-history-site.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserHistorySite])],
  providers: [
    {
      provide: 'IUserHistorySiteRepository',
      useClass: UserHistorySiteRepository,
    },
    UserHistorySiteRepository,
  ],
  exports: ['IUserHistorySiteRepository', UserHistorySiteRepository],
})
export class UserHistorySitePersistenceModule {}

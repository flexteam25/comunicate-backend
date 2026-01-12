import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSearchSite } from './domain/entities/user-search-site.entity';
import { UserSearchSiteRepository } from './infrastructure/persistence/typeorm/user-search-site.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserSearchSite])],
  providers: [
    {
      provide: 'IUserSearchSiteRepository',
      useClass: UserSearchSiteRepository,
    },
  ],
  exports: ['IUserSearchSiteRepository'],
})
export class UserSearchSitePersistenceModule {}

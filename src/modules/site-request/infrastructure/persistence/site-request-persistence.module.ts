import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteRequest } from '../../domain/entities/site-request.entity';
import { SiteRequestRepository } from './typeorm/site-request.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SiteRequest])],
  providers: [
    {
      provide: 'ISiteRequestRepository',
      useClass: SiteRequestRepository,
    },
    SiteRequestRepository,
  ],
  exports: ['ISiteRequestRepository', SiteRequestRepository],
})
export class SiteRequestPersistenceModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerRequest } from './domain/entities/partner-request.entity';
import { PartnerRequestRepository } from './infrastructure/persistence/typeorm/partner-request.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerRequest])],
  exports: [TypeOrmModule, 'IPartnerRequestRepository', PartnerRequestRepository],
  providers: [
    {
      provide: 'IPartnerRequestRepository',
      useClass: PartnerRequestRepository,
    },
    PartnerRequestRepository,
  ],
})
export class PartnerPersistenceModule {}

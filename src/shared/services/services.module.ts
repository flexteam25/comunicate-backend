import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from '../../domains/game/entities/partner.entity';
import { PartnerBackendService } from './partner-backend.service';

@Module({
  imports: [TypeOrmModule.forFeature([Partner])],
  providers: [PartnerBackendService],
  exports: [PartnerBackendService],
})
export class ServicesModule {}


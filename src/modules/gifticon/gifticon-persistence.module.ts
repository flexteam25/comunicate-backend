import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gifticon } from './domain/entities/gifticon.entity';
import { GifticonRedemption } from './domain/entities/gifticon-redemption.entity';
import { GifticonRepository } from './infrastructure/persistence/typeorm/gifticon.repository';
import { GifticonRedemptionRepository } from './infrastructure/persistence/typeorm/gifticon-redemption.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Gifticon, GifticonRedemption])],
  exports: [
    TypeOrmModule,
    'IGifticonRepository',
    'IGifticonRedemptionRepository',
    GifticonRepository,
    GifticonRedemptionRepository,
  ],
  providers: [
    {
      provide: 'IGifticonRepository',
      useClass: GifticonRepository,
    },
    {
      provide: 'IGifticonRedemptionRepository',
      useClass: GifticonRedemptionRepository,
    },
    GifticonRepository,
    GifticonRedemptionRepository,
  ],
})
export class GifticonPersistenceModule {}

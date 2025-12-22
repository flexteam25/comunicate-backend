import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gifticon } from './domain/entities/gifticon.entity';
import { GifticonRepository } from './infrastructure/persistence/typeorm/gifticon.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Gifticon])],
  exports: [
    TypeOrmModule,
    'IGifticonRepository',
    GifticonRepository,
  ],
  providers: [
    {
      provide: 'IGifticonRepository',
      useClass: GifticonRepository,
    },
    GifticonRepository,
  ],
})
export class GifticonPersistenceModule {}

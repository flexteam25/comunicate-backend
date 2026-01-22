import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointTransaction } from './domain/entities/point-transaction.entity';
import { PointExchange } from './domain/entities/point-exchange.entity';
import { PointSetting } from './domain/entities/point-setting.entity';
import { PointTransactionRepository } from './infrastructure/persistence/typeorm/point-transaction.repository';
import { PointExchangeRepository } from './infrastructure/persistence/typeorm/point-exchange.repository';
import { PointSettingRepository } from './infrastructure/persistence/typeorm/point-setting.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PointTransaction, PointExchange, PointSetting])],
  exports: [
    TypeOrmModule,
    'IPointTransactionRepository',
    'IPointExchangeRepository',
    'IPointSettingRepository',
    PointTransactionRepository,
    PointExchangeRepository,
    PointSettingRepository,
  ],
  providers: [
    {
      provide: 'IPointTransactionRepository',
      useClass: PointTransactionRepository,
    },
    {
      provide: 'IPointExchangeRepository',
      useClass: PointExchangeRepository,
    },
    {
      provide: 'IPointSettingRepository',
      useClass: PointSettingRepository,
    },
    PointTransactionRepository,
    PointExchangeRepository,
    PointSettingRepository,
  ],
})
export class PointPersistenceModule {}

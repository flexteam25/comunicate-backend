import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointTransaction } from './domain/entities/point-transaction.entity';
import { PointExchange } from './domain/entities/point-exchange.entity';
import { PointTransactionRepository } from './infrastructure/persistence/typeorm/point-transaction.repository';
import { PointExchangeRepository } from './infrastructure/persistence/typeorm/point-exchange.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PointTransaction, PointExchange])],
  exports: [
    TypeOrmModule,
    'IPointTransactionRepository',
    'IPointExchangeRepository',
    PointTransactionRepository,
    PointExchangeRepository,
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
    PointTransactionRepository,
    PointExchangeRepository,
  ],
})
export class PointPersistenceModule {}

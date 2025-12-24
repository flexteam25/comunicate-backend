import { Module } from '@nestjs/common';
import { PointPersistenceModule } from './point-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UserModule } from '../user/user.module';
import { SiteModule } from '../site/site.module';
import { CreatePointTransactionUseCase } from './application/handlers/create-point-transaction.use-case';
import { GetPointHistoryUseCase } from './application/handlers/get-point-history.use-case';
import { RequestPointExchangeUseCase } from './application/handlers/user/request-point-exchange.use-case';
import { GetMyExchangesUseCase } from './application/handlers/user/get-my-exchanges.use-case';
import { GetExchangeDetailUseCase } from './application/handlers/user/get-exchange-detail.use-case';
import { ListExchangesUseCase } from './application/handlers/admin/list-exchanges.use-case';
import { GetExchangeDetailUseCase as AdminGetExchangeDetailUseCase } from './application/handlers/admin/get-exchange-detail.use-case';
import { MoveExchangeToProcessingUseCase } from './application/handlers/admin/move-exchange-to-processing.use-case';
import { ApproveExchangeUseCase } from './application/handlers/admin/approve-exchange.use-case';
import { RejectExchangeUseCase } from './application/handlers/admin/reject-exchange.use-case';
import { CancelExchangeUseCase } from './application/handlers/user/cancel-exchange.use-case';
import { PointController } from './interface/rest/user/point.controller';
import { AdminPointExchangeController } from './interface/rest/admin/point-exchange.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';

@Module({
  imports: [
    PointPersistenceModule,
    ServicesModule,
    UserModule,
    SiteModule,
    AdminGuardsModule,
    UserTokenRepositoryModule,
  ],
  controllers: [PointController, AdminPointExchangeController],
  providers: [
    CreatePointTransactionUseCase,
    GetPointHistoryUseCase,
    RequestPointExchangeUseCase,
    GetMyExchangesUseCase,
    GetExchangeDetailUseCase,
    CancelExchangeUseCase,
    ListExchangesUseCase,
    AdminGetExchangeDetailUseCase,
    MoveExchangeToProcessingUseCase,
    ApproveExchangeUseCase,
    RejectExchangeUseCase,
  ],
  exports: [CreatePointTransactionUseCase, PointPersistenceModule],
})
export class PointModule {}

import { Module } from '@nestjs/common';
import { PointPersistenceModule } from './point-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
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
import { ListPointTransactionsUseCase } from './application/handlers/admin/list-point-transactions.use-case';
import { PointController } from './interface/rest/user/point.controller';
import { AdminPointExchangeController } from './interface/rest/admin/point-exchange.controller';
import { AdminPointTransactionController } from './interface/rest/admin/point-transaction.controller';
import { ManagerPointExchangeController } from './interface/rest/manager/manager-point-exchange.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { SiteManagerPersistenceModule } from '../site-manager/site-manager-persistence.module';
import { ListSiteExchangesUseCase } from './application/handlers/manager/list-site-exchanges.use-case';
import { ManagerApproveExchangeUseCase } from './application/handlers/manager/manager-approve-exchange.use-case';
import { ManagerRejectExchangeUseCase } from './application/handlers/manager/manager-reject-exchange.use-case';
import { ManagerMoveExchangeToProcessingUseCase } from './application/handlers/manager/manager-move-exchange-to-processing.use-case';
import { ListPointSettingsUseCase } from './application/handlers/admin/list-point-settings.use-case';
import { UpdatePointSettingUseCase } from './application/handlers/admin/update-point-setting.use-case';
import { AdminPointSettingController } from './interface/rest/admin/point-setting.controller';

@Module({
  imports: [
    PointPersistenceModule,
    ServicesModule,
    UserPersistenceModule,
    SiteModule,
    SiteManagerPersistenceModule,
    AdminGuardsModule,
    AuthPersistenceModule,
  ],
  controllers: [
    PointController,
    AdminPointExchangeController,
    AdminPointTransactionController,
    ManagerPointExchangeController,
    AdminPointSettingController,
  ],
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
    ListPointTransactionsUseCase,
    ListSiteExchangesUseCase,
    ManagerApproveExchangeUseCase,
    ManagerRejectExchangeUseCase,
    ManagerMoveExchangeToProcessingUseCase,
    ListPointSettingsUseCase,
    UpdatePointSettingUseCase,
  ],
  exports: [CreatePointTransactionUseCase, PointPersistenceModule],
})
export class PointModule {}

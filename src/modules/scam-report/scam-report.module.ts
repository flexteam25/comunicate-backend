import { Module } from '@nestjs/common';
import { ScamReportPersistenceModule } from './scam-report-persistence.module';
import { CreateScamReportUseCase } from './application/handlers/create-scam-report.use-case';
import { ListScamReportsUseCase } from './application/handlers/list-scam-reports.use-case';
import { ListMyScamReportsUseCase } from './application/handlers/list-my-scam-reports.use-case';
import { GetScamReportUseCase } from './application/handlers/get-scam-report.use-case';
import { UpdateScamReportUseCase } from './application/handlers/update-scam-report.use-case';
import { DeleteScamReportUseCase } from './application/handlers/delete-scam-report.use-case';
import { ApproveScamReportUseCase } from './application/handlers/approve-scam-report.use-case';
import { RejectScamReportUseCase } from './application/handlers/reject-scam-report.use-case';
import { AddCommentUseCase } from './application/handlers/add-comment.use-case';
import { DeleteCommentUseCase } from './application/handlers/delete-comment.use-case';
import { ListScamReportCommentsUseCase } from './application/handlers/list-scam-report-comments.use-case';
import { ReactToScamReportUseCase } from './application/handlers/react-to-scam-report.use-case';
import { AdminCreateScamReportUseCase } from './application/handlers/admin-create-scam-report.use-case';
import { AdminUpdateScamReportUseCase } from './application/handlers/admin-update-scam-report.use-case';
import { AdminDeleteScamReportUseCase } from './application/handlers/admin-delete-scam-report.use-case';
import { ScamReportController } from './interface/rest/user/scam-report.controller';
import { AdminScamReportController } from './interface/rest/admin/scam-report.controller';
import { SitePersistenceModule } from '../site/site-persistence.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';

@Module({
  imports: [
    ScamReportPersistenceModule,
    SitePersistenceModule,
    AdminGuardsModule,
    UploadModule.register({ storageType: 'local' }),
    AuthPersistenceModule,
  ],
  providers: [
    CreateScamReportUseCase,
    ListScamReportsUseCase,
    ListMyScamReportsUseCase,
    GetScamReportUseCase,
    UpdateScamReportUseCase,
    DeleteScamReportUseCase,
    ApproveScamReportUseCase,
    RejectScamReportUseCase,
    AddCommentUseCase,
    DeleteCommentUseCase,
    ListScamReportCommentsUseCase,
    ReactToScamReportUseCase,
    AdminCreateScamReportUseCase,
    AdminUpdateScamReportUseCase,
    AdminDeleteScamReportUseCase,
  ],
  controllers: [ScamReportController, AdminScamReportController],
  exports: [ScamReportPersistenceModule, ListScamReportsUseCase],
})
export class ScamReportModule {}

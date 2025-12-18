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
import { ScamReportController } from './interface/rest/user/scam-report.controller';
import { AdminScamReportController } from './interface/rest/admin/scam-report.controller';
import { SiteModule } from '../site/site.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    ScamReportPersistenceModule,
    forwardRef(() => SiteModule),
    AdminGuardsModule,
    UploadModule.register({ storageType: 'local' }),
    UserTokenRepositoryModule,
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
  ],
  controllers: [ScamReportController, AdminScamReportController],
  exports: [ScamReportPersistenceModule, ListScamReportsUseCase],
})
export class ScamReportModule {}

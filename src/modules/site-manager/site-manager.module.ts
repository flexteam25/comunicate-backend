import { Module } from '@nestjs/common';
import { SiteManagerPersistenceModule } from './site-manager-persistence.module';
import { SitePersistenceModule } from '../site/site-persistence.module';
import { TierModule } from '../tier/tier.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UploadModule } from '../../shared/services/upload';
import { ApplySiteManagerUseCase } from './application/handlers/apply-site-manager.use-case';
import { ApproveApplicationUseCase } from './application/handlers/admin/approve-application.use-case';
import { RejectApplicationUseCase } from './application/handlers/admin/reject-application.use-case';
import { ListApplicationsUseCase } from './application/handlers/admin/list-applications.use-case';
import { GetApplicationUseCase } from './application/handlers/admin/get-application.use-case';
import { ListMyApplicationsUseCase } from './application/handlers/user/list-my-applications.use-case';
import { GetManagedSitesUseCase } from './application/handlers/user/get-managed-sites.use-case';
import { UpdateManagedSiteUseCase } from './application/handlers/user/update-managed-site.use-case';
import {
  SiteManagerController,
  ManagerApplicationController,
} from './interface/rest/user/site-manager.controller';
import { AdminSiteManagerController } from './interface/rest/admin/site-manager.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';

@Module({
  imports: [
    SiteManagerPersistenceModule,
    SitePersistenceModule,
    TierModule,
    AuthPersistenceModule,
    ServicesModule,
    UploadModule.register({ storageType: 'local' }),
    AdminGuardsModule,
  ],
  controllers: [
    SiteManagerController,
    ManagerApplicationController,
    AdminSiteManagerController,
  ],
  providers: [
    ApplySiteManagerUseCase,
    ApproveApplicationUseCase,
    RejectApplicationUseCase,
    ListApplicationsUseCase,
    GetApplicationUseCase,
    ListMyApplicationsUseCase,
    GetManagedSitesUseCase,
    UpdateManagedSiteUseCase,
  ],
  exports: [],
})
export class SiteManagerModule {}

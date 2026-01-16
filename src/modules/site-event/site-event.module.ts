import { Module } from '@nestjs/common';
import { SiteEventPersistenceModule } from './site-event-persistence.module';
import { SitePersistenceModule } from '../site/site-persistence.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { SiteManagerPersistenceModule } from '../site-manager/site-manager-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UploadModule } from '../../shared/services/upload';

// User handlers
import { CreateSiteEventUseCase } from './application/handlers/user/create-site-event.use-case';
import { UpdateSiteEventUseCase } from './application/handlers/user/update-site-event.use-case';
import { ListSiteEventsUseCase } from './application/handlers/user/list-site-events.use-case';
import { GetSiteEventUseCase } from './application/handlers/user/get-site-event.use-case';
import { DeleteSiteEventUseCase } from './application/handlers/user/delete-site-event.use-case';

// Admin handlers
import { CreateSiteEventUseCase as AdminCreateSiteEventUseCase } from './application/handlers/admin/create-site-event.use-case';
import { UpdateSiteEventUseCase as AdminUpdateSiteEventUseCase } from './application/handlers/admin/update-site-event.use-case';
import { ListSiteEventsUseCase as AdminListSiteEventsUseCase } from './application/handlers/admin/list-site-events.use-case';
import { GetSiteEventUseCase as AdminGetSiteEventUseCase } from './application/handlers/admin/get-site-event.use-case';
import { DeleteSiteEventUseCase as AdminDeleteSiteEventUseCase } from './application/handlers/admin/delete-site-event.use-case';

// Controllers
import { SiteEventController } from './interface/rest/user/site-event.controller';
import { AdminSiteEventController } from './interface/rest/admin/site-event.controller';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';

@Module({
  imports: [
    SiteEventPersistenceModule,
    SitePersistenceModule,
    AdminGuardsModule,
    SiteManagerPersistenceModule,
    ServicesModule,
    UploadModule.register({ storageType: 'local' }),
    AuthPersistenceModule,
  ],
  providers: [
    // User use cases
    CreateSiteEventUseCase,
    UpdateSiteEventUseCase,
    ListSiteEventsUseCase,
    GetSiteEventUseCase,
    DeleteSiteEventUseCase,
    // Admin use cases
    AdminCreateSiteEventUseCase,
    AdminUpdateSiteEventUseCase,
    AdminListSiteEventsUseCase,
    AdminGetSiteEventUseCase,
    AdminDeleteSiteEventUseCase,
  ],
  controllers: [SiteEventController, AdminSiteEventController],
  exports: [SiteEventPersistenceModule],
})
export class SiteEventModule {}

import { Module } from '@nestjs/common';
import { PocaEventPersistenceModule } from './poca-event-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { ListPocaEventsUseCase } from './application/handlers/user/list-poca-events.use-case';
import { GetPocaEventUseCase } from './application/handlers/user/get-poca-event.use-case';
import { CreatePocaEventUseCase } from './application/handlers/admin/create-poca-event.use-case';
import { UpdatePocaEventUseCase } from './application/handlers/admin/update-poca-event.use-case';
import { DeletePocaEventUseCase } from './application/handlers/admin/delete-poca-event.use-case';
import { AdminListPocaEventsUseCase } from './application/handlers/admin/list-poca-events.use-case';
import { AdminGetPocaEventUseCase } from './application/handlers/admin/get-poca-event.use-case';
import { PocaEventController } from './interface/rest/user/poca-event.controller';
import { AdminPocaEventController } from './interface/rest/admin/poca-event.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';

@Module({
  imports: [
    PocaEventPersistenceModule,
    ServicesModule,
    AuthPersistenceModule,
    AdminGuardsModule,
    UploadModule.register({ storageType: 'local' }),
  ],
  controllers: [PocaEventController, AdminPocaEventController],
  providers: [
    ListPocaEventsUseCase,
    GetPocaEventUseCase,
    CreatePocaEventUseCase,
    UpdatePocaEventUseCase,
    DeletePocaEventUseCase,
    AdminListPocaEventsUseCase,
    AdminGetPocaEventUseCase,
  ],
  exports: [],
})
export class PocaEventModule {}

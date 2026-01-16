import { Module } from '@nestjs/common';
import { ServicesModule } from '../../shared/services/services.module';
import { UploadModule } from '../../shared/services/upload';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { EditorController } from './interface/rest/user/editor.controller';
import { AdminEditorController } from './interface/rest/admin/editor.controller';

@Module({
  imports: [
    ServicesModule,
    UploadModule.register({ storageType: 'local' }),
    AuthPersistenceModule,
    AdminGuardsModule,
  ],
  controllers: [EditorController, AdminEditorController],
  providers: [],
  exports: [],
})
export class EditorModule {}

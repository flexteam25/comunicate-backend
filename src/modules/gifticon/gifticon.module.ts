import { Module } from '@nestjs/common';
import { GifticonPersistenceModule } from './gifticon-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { ListGifticonsUseCase } from './application/handlers/user/list-gifticons.use-case';
import { GetGifticonUseCase } from './application/handlers/user/get-gifticon.use-case';
import { CreateGifticonUseCase } from './application/handlers/admin/create-gifticon.use-case';
import { UpdateGifticonUseCase } from './application/handlers/admin/update-gifticon.use-case';
import { DeleteGifticonUseCase } from './application/handlers/admin/delete-gifticon.use-case';
import { AdminListGifticonsUseCase } from './application/handlers/admin/list-gifticons.use-case';
import { AdminGetGifticonUseCase } from './application/handlers/admin/get-gifticon.use-case';
import { GifticonController } from './interface/rest/user/gifticon.controller';
import { AdminGifticonController } from './interface/rest/admin/gifticon.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';

@Module({
  imports: [
    GifticonPersistenceModule,
    ServicesModule,
    AdminGuardsModule,
    UploadModule.register({ storageType: 'local' }),
  ],
  controllers: [GifticonController, AdminGifticonController],
  providers: [
    ListGifticonsUseCase,
    GetGifticonUseCase,
    CreateGifticonUseCase,
    UpdateGifticonUseCase,
    DeleteGifticonUseCase,
    AdminListGifticonsUseCase,
    AdminGetGifticonUseCase,
  ],
  exports: [],
})
export class GifticonModule {}

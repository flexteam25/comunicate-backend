import { Module } from '@nestjs/common';
import { GifticonPersistenceModule } from './gifticon-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UserModule } from '../user/user.module';
import { PointModule } from '../point/point.module';
import { ListGifticonsUseCase } from './application/handlers/user/list-gifticons.use-case';
import { GetGifticonUseCase } from './application/handlers/user/get-gifticon.use-case';
import { RedeemGifticonUseCase } from './application/handlers/user/redeem-gifticon.use-case';
import { GetMyRedemptionsUseCase } from './application/handlers/user/get-my-redemptions.use-case';
import { GetRedemptionDetailUseCase } from './application/handlers/user/get-redemption-detail.use-case';
import { CreateGifticonUseCase } from './application/handlers/admin/create-gifticon.use-case';
import { UpdateGifticonUseCase } from './application/handlers/admin/update-gifticon.use-case';
import { DeleteGifticonUseCase } from './application/handlers/admin/delete-gifticon.use-case';
import { AdminListGifticonsUseCase } from './application/handlers/admin/list-gifticons.use-case';
import { AdminGetGifticonUseCase } from './application/handlers/admin/get-gifticon.use-case';
import { ListRedemptionsUseCase } from './application/handlers/admin/list-redemptions.use-case';
import { GetRedemptionDetailUseCase as AdminGetRedemptionDetailUseCase } from './application/handlers/admin/get-redemption-detail.use-case';
import { ApproveRedemptionUseCase } from './application/handlers/admin/approve-redemption.use-case';
import { RejectRedemptionUseCase } from './application/handlers/admin/reject-redemption.use-case';
import { CancelRedemptionUseCase } from './application/handlers/user/cancel-redemption.use-case';
import { GifticonController } from './interface/rest/user/gifticon.controller';
import { AdminGifticonController } from './interface/rest/admin/gifticon.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';

@Module({
  imports: [
    GifticonPersistenceModule,
    ServicesModule,
    UserModule,
    PointModule,
    AdminGuardsModule,
    AuthPersistenceModule,
    UploadModule.register({ storageType: 'local' }),
  ],
  controllers: [GifticonController, AdminGifticonController],
  providers: [
    ListGifticonsUseCase,
    GetGifticonUseCase,
    RedeemGifticonUseCase,
    GetMyRedemptionsUseCase,
    GetRedemptionDetailUseCase,
    CancelRedemptionUseCase,
    CreateGifticonUseCase,
    UpdateGifticonUseCase,
    DeleteGifticonUseCase,
    AdminListGifticonsUseCase,
    AdminGetGifticonUseCase,
    ListRedemptionsUseCase,
    AdminGetRedemptionDetailUseCase,
    ApproveRedemptionUseCase,
    RejectRedemptionUseCase,
  ],
  exports: [],
})
export class GifticonModule {}

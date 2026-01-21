import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerPersistenceModule } from './partner-persistence.module';
import { User } from '../user/domain/entities/user.entity';
import { Role } from '../user/domain/entities/role.entity';
import { UserRole } from '../user/domain/entities/user-role.entity';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { GetMyPartnerRequestUseCase } from './application/handlers/user/get-my-partner-request.use-case';
import { CreatePartnerRequestUseCase } from './application/handlers/user/create-partner-request.use-case';
import { ListPartnerRequestsUseCase } from './application/handlers/admin/list-partner-requests.use-case';
import { ApprovePartnerRequestUseCase } from './application/handlers/admin/approve-partner-request.use-case';
import { RejectPartnerRequestUseCase } from './application/handlers/admin/reject-partner-request.use-case';
import { ListPartnerUsersUseCase } from './application/handlers/admin/list-partner-users.use-case';
import { PartnerController } from './interface/rest/user/partner.controller';
import { AdminPartnerController } from './interface/rest/admin/partner.controller';
import { SiteManagerPersistenceModule } from '../site-manager/site-manager-persistence.module';

@Module({
  imports: [
    PartnerPersistenceModule,
    TypeOrmModule.forFeature([User, Role, UserRole]),
    AdminGuardsModule,
    AuthPersistenceModule,
    SiteManagerPersistenceModule,
  ],
  providers: [
    GetMyPartnerRequestUseCase,
    CreatePartnerRequestUseCase,
    ListPartnerRequestsUseCase,
    ApprovePartnerRequestUseCase,
    RejectPartnerRequestUseCase,
    ListPartnerUsersUseCase,
  ],
  controllers: [PartnerController, AdminPartnerController],
  exports: [PartnerPersistenceModule],
})
export class PartnerModule {}

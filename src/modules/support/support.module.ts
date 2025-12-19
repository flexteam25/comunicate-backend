import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './domain/entities/inquiry.entity';
import { InquiryRepository } from './infrastructure/persistence/typeorm/inquiry.repository';
import { CreateInquiryUseCase } from './application/handlers/user/create-inquiry.use-case';
import { ListInquiriesUseCase } from './application/handlers/admin/list-inquiries.use-case';
import { GetInquiryUseCase } from './application/handlers/admin/get-inquiry.use-case';
import { ReplyInquiryUseCase } from './application/handlers/admin/reply-inquiry.use-case';
import { TransactionService } from '../../shared/services/transaction.service';
import { UploadModule } from '../../shared/services/upload';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';
import { UserSupportController } from './interface/rest/user/support.controller';
import { AdminSupportController } from './interface/rest/admin/support.controller';
import { UpdateUserInquiryUseCase } from './application/handlers/user/update-user-inquiry.use-case';
import { ListUserInquiriesUseCase } from './application/handlers/user/list-user-inquiries.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry]),
    UploadModule.register({ storageType: 'local' }),
    AdminGuardsModule,
    UserTokenRepositoryModule,
  ],

  controllers: [UserSupportController, AdminSupportController],
  providers: [
    {
      provide: 'IInquiryRepository',
      useClass: InquiryRepository,
    },
    InquiryRepository,
    // User use cases
    CreateInquiryUseCase,
    UpdateUserInquiryUseCase,
    ListUserInquiriesUseCase,
    // Admin use cases
    ListInquiriesUseCase,
    GetInquiryUseCase,
    ReplyInquiryUseCase,
    TransactionService,
  ],
  exports: [
    'IInquiryRepository',
    InquiryRepository,
  ],
})
export class SupportModule {}

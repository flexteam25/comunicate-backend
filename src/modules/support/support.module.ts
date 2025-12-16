import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './domain/entities/inquiry.entity';
import { Feedback } from './domain/entities/feedback.entity';
import { BugReport } from './domain/entities/bug-report.entity';
import { AdvertisingContact } from './domain/entities/advertising-contact.entity';
import { InquiryRepository } from './infrastructure/persistence/typeorm/inquiry.repository';
import { FeedbackRepository } from './infrastructure/persistence/typeorm/feedback.repository';
import { BugReportRepository } from './infrastructure/persistence/typeorm/bug-report.repository';
import { AdvertisingContactRepository } from './infrastructure/persistence/typeorm/advertising-contact.repository';
import { CreateInquiryUseCase } from './application/handlers/user/create-inquiry.use-case';
import { CreateFeedbackUseCase } from './application/handlers/user/create-feedback.use-case';
import { CreateBugReportUseCase } from './application/handlers/user/create-bug-report.use-case';
import { CreateAdvertisingContactUseCase } from './application/handlers/user/create-advertising-contact.use-case';
import { ListInquiriesUseCase } from './application/handlers/admin/list-inquiries.use-case';
import { GetInquiryUseCase } from './application/handlers/admin/get-inquiry.use-case';
import { ReplyInquiryUseCase } from './application/handlers/admin/reply-inquiry.use-case';
import { ListFeedbacksUseCase } from './application/handlers/admin/list-feedbacks.use-case';
import { MarkFeedbackViewedUseCase } from './application/handlers/admin/mark-feedback-viewed.use-case';
import { ListBugReportsUseCase } from './application/handlers/admin/list-bug-reports.use-case';
import { MarkBugReportViewedUseCase } from './application/handlers/admin/mark-bug-report-viewed.use-case';
import { ListAdvertisingContactsUseCase } from './application/handlers/admin/list-advertising-contacts.use-case';
import { MarkAdvertisingContactViewedUseCase } from './application/handlers/admin/mark-advertising-contact-viewed.use-case';
import { TransactionService } from '../../shared/services/transaction.service';
import { UploadModule } from '../../shared/services/upload';
import { AdminModule } from '../admin/admin.module';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';
import { UserSupportController } from './interface/rest/user/support.controller';
import { AdminSupportController } from './interface/rest/admin/support.controller';
import { UpdateUserInquiryUseCase } from './application/handlers/user/update-user-inquiry.use-case';
import { ListUserInquiriesUseCase } from './application/handlers/user/list-user-inquiries.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, Feedback, BugReport, AdvertisingContact]),
    UploadModule.register({ storageType: 'local' }),
    AdminModule,
    UserTokenRepositoryModule,
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  controllers: [UserSupportController, AdminSupportController],
  providers: [
    {
      provide: 'IInquiryRepository',
      useClass: InquiryRepository,
    },
    {
      provide: 'IFeedbackRepository',
      useClass: FeedbackRepository,
    },
    {
      provide: 'IBugReportRepository',
      useClass: BugReportRepository,
    },
    {
      provide: 'IAdvertisingContactRepository',
      useClass: AdvertisingContactRepository,
    },
    InquiryRepository,
    FeedbackRepository,
    BugReportRepository,
    AdvertisingContactRepository,
    // User use cases
    CreateInquiryUseCase,
    UpdateUserInquiryUseCase,
    ListUserInquiriesUseCase,
    CreateFeedbackUseCase,
    CreateBugReportUseCase,
    CreateAdvertisingContactUseCase,
    // Admin use cases
    ListInquiriesUseCase,
    GetInquiryUseCase,
    ReplyInquiryUseCase,
    ListFeedbacksUseCase,
    MarkFeedbackViewedUseCase,
    ListBugReportsUseCase,
    MarkBugReportViewedUseCase,
    ListAdvertisingContactsUseCase,
    MarkAdvertisingContactViewedUseCase,
    TransactionService,
  ],
  exports: [
    'IInquiryRepository',
    'IFeedbackRepository',
    'IBugReportRepository',
    'IAdvertisingContactRepository',
    InquiryRepository,
    FeedbackRepository,
    BugReportRepository,
    AdvertisingContactRepository,
  ],
})
export class SupportModule {}

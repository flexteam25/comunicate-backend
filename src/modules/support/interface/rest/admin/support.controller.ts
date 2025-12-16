import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ListInquiriesUseCase } from '../../../application/handlers/admin/list-inquiries.use-case';
import { GetInquiryUseCase } from '../../../application/handlers/admin/get-inquiry.use-case';
import { ReplyInquiryUseCase } from '../../../application/handlers/admin/reply-inquiry.use-case';
import { ListFeedbacksUseCase } from '../../../application/handlers/admin/list-feedbacks.use-case';
import { MarkFeedbackViewedUseCase } from '../../../application/handlers/admin/mark-feedback-viewed.use-case';
import { ListBugReportsUseCase } from '../../../application/handlers/admin/list-bug-reports.use-case';
import { MarkBugReportViewedUseCase } from '../../../application/handlers/admin/mark-bug-report-viewed.use-case';
import { ListAdvertisingContactsUseCase } from '../../../application/handlers/admin/list-advertising-contacts.use-case';
import { MarkAdvertisingContactViewedUseCase } from '../../../application/handlers/admin/mark-advertising-contact-viewed.use-case';
import { ListInquiriesQueryDto } from '../dto/list-inquiries-query.dto';
import { ListFeedbacksQueryDto } from '../dto/list-feedbacks-query.dto';
import { ListBugReportsQueryDto } from '../dto/list-bug-reports-query.dto';
import { ListAdvertisingContactsQueryDto } from '../dto/list-advertising-contacts-query.dto';
import { ReplyInquiryDto } from '../dto/reply-inquiry.dto';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { Feedback } from '../../../domain/entities/feedback.entity';
import { BugReport } from '../../../domain/entities/bug-report.entity';
import { AdvertisingContact } from '../../../domain/entities/advertising-contact.entity';

const INQUIRY_STATUS_OPTIONS = [
  { value: InquiryStatus.PENDING, text: 'Pending' },
  { value: InquiryStatus.PROCESSING, text: 'Processing' },
  { value: InquiryStatus.CLOSED, text: 'Closed' },
  { value: InquiryStatus.RESOLVED, text: 'Resolved' },
];

@Controller('admin/support')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSupportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listInquiriesUseCase: ListInquiriesUseCase,
    private readonly getInquiryUseCase: GetInquiryUseCase,
    private readonly replyInquiryUseCase: ReplyInquiryUseCase,
    private readonly listFeedbacksUseCase: ListFeedbacksUseCase,
    private readonly markFeedbackViewedUseCase: MarkFeedbackViewedUseCase,
    private readonly listBugReportsUseCase: ListBugReportsUseCase,
    private readonly markBugReportViewedUseCase: MarkBugReportViewedUseCase,
    private readonly listAdvertisingContactsUseCase: ListAdvertisingContactsUseCase,
    private readonly markAdvertisingContactViewedUseCase: MarkAdvertisingContactViewedUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || 'http://localhost:3000';
  }

  // ========== Inquiry Endpoints ==========
  @Get('inquiries/statuses')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.view')
  async getInquiryStatuses(): Promise<ApiResponse<any>> {
    return ApiResponseUtil.success(INQUIRY_STATUS_OPTIONS);
  }

  @Get('inquiries')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.view')
  async listInquiries(@Query() query: ListInquiriesQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listInquiriesUseCase.execute({
      filters: {
        userId: query.userId,
        status: query.status,
        adminId: query.adminId,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((inquiry) => this.mapInquiryToResponse(inquiry)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('inquiries/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.view')
  async getInquiry(@Param('id') id: string): Promise<ApiResponse<any>> {
    const inquiry = await this.getInquiryUseCase.execute(id);
    return ApiResponseUtil.success(this.mapInquiryToResponse(inquiry));
  }

  @Put('inquiries/:id/reply')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.reply')
  async replyInquiry(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: ReplyInquiryDto,
  ): Promise<ApiResponse<any>> {
    const inquiry = await this.replyInquiryUseCase.execute({
      inquiryId: id,
      adminId: admin.adminId,
      reply: dto.reply,
      status: dto.status,
    });

    return ApiResponseUtil.success(this.mapInquiryToResponse(inquiry), 'Inquiry replied successfully');
  }

  // ========== Feedback Endpoints ==========
  @Get('feedbacks')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.feedback.view')
  async listFeedbacks(@Query() query: ListFeedbacksQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listFeedbacksUseCase.execute({
      filters: {
        userId: query.userId,
        isViewed: query.isViewed,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((feedback) => this.mapFeedbackToResponse(feedback)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Put('feedbacks/:id/mark-viewed')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.feedback.update')
  async markFeedbackViewed(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const feedback = await this.markFeedbackViewedUseCase.execute({
      feedbackId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(this.mapFeedbackToResponse(feedback), 'Feedback marked as viewed');
  }

  // ========== Bug Report Endpoints ==========
  @Get('bug-reports')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.bug.view')
  async listBugReports(@Query() query: ListBugReportsQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listBugReportsUseCase.execute({
      filters: {
        userId: query.userId,
        isViewed: query.isViewed,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((bugReport) => this.mapBugReportToResponse(bugReport)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Put('bug-reports/:id/mark-viewed')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.bug.update')
  async markBugReportViewed(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const bugReport = await this.markBugReportViewedUseCase.execute({
      bugReportId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(this.mapBugReportToResponse(bugReport), 'Bug report marked as viewed');
  }

  // ========== Advertising Contact Endpoints ==========
  @Get('advertising-contacts')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.advertising.view')
  async listAdvertisingContacts(@Query() query: ListAdvertisingContactsQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listAdvertisingContactsUseCase.execute({
      filters: {
        userId: query.userId,
        isViewed: query.isViewed,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((adContact) => this.mapAdvertisingContactToResponse(adContact)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Put('advertising-contacts/:id/mark-viewed')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.advertising.update')
  async markAdvertisingContactViewed(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const advertisingContact = await this.markAdvertisingContactViewedUseCase.execute({
      advertisingContactId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      this.mapAdvertisingContactToResponse(advertisingContact),
      'Advertising contact marked as viewed',
    );
  }

  // ========== Response Mappers ==========
  private mapInquiryToResponse(inquiry: Inquiry): any {
    return {
      id: inquiry.id,
      userId: inquiry.userId,
      user: inquiry.user
        ? {
            id: inquiry.user.id,
            email: inquiry.user.email,
            displayName: inquiry.user.displayName,
          }
        : undefined,
      message: inquiry.message,
      images: inquiry.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
      status: inquiry.status,
      adminId: inquiry.adminId,
      admin: inquiry.admin
        ? {
            id: inquiry.admin.id,
            email: inquiry.admin.email,
            displayName: inquiry.admin.displayName,
          }
        : undefined,
      adminReply: inquiry.adminReply,
      repliedAt: inquiry.repliedAt,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
    };
  }

  private mapFeedbackToResponse(feedback: Feedback): any {
    return {
      id: feedback.id,
      userId: feedback.userId,
      user: feedback.user
        ? {
            id: feedback.user.id,
            email: feedback.user.email,
            displayName: feedback.user.displayName,
          }
        : undefined,
      message: feedback.message,
      images: feedback.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
      isViewed: feedback.isViewed,
      viewedByAdminId: feedback.viewedByAdminId,
      viewedByAdmin: feedback.viewedByAdmin
        ? {
            id: feedback.viewedByAdmin.id,
            email: feedback.viewedByAdmin.email,
            displayName: feedback.viewedByAdmin.displayName,
          }
        : undefined,
      viewedAt: feedback.viewedAt,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }

  private mapBugReportToResponse(bugReport: BugReport): any {
    return {
      id: bugReport.id,
      userId: bugReport.userId,
      user: bugReport.user
        ? {
            id: bugReport.user.id,
            email: bugReport.user.email,
            displayName: bugReport.user.displayName,
          }
        : undefined,
      message: bugReport.message,
      images: bugReport.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
      isViewed: bugReport.isViewed,
      viewedByAdminId: bugReport.viewedByAdminId,
      viewedByAdmin: bugReport.viewedByAdmin
        ? {
            id: bugReport.viewedByAdmin.id,
            email: bugReport.viewedByAdmin.email,
            displayName: bugReport.viewedByAdmin.displayName,
          }
        : undefined,
      viewedAt: bugReport.viewedAt,
      createdAt: bugReport.createdAt,
      updatedAt: bugReport.updatedAt,
    };
  }

  private mapAdvertisingContactToResponse(advertisingContact: AdvertisingContact): any {
    return {
      id: advertisingContact.id,
      userId: advertisingContact.userId,
      user: advertisingContact.user
        ? {
            id: advertisingContact.user.id,
            email: advertisingContact.user.email,
            displayName: advertisingContact.user.displayName,
          }
        : undefined,
      message: advertisingContact.message,
      images: advertisingContact.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
      isViewed: advertisingContact.isViewed,
      viewedByAdminId: advertisingContact.viewedByAdminId,
      viewedByAdmin: advertisingContact.viewedByAdmin
        ? {
            id: advertisingContact.viewedByAdmin.id,
            email: advertisingContact.viewedByAdmin.email,
            displayName: advertisingContact.viewedByAdmin.displayName,
          }
        : undefined,
      viewedAt: advertisingContact.viewedAt,
      createdAt: advertisingContact.createdAt,
      updatedAt: advertisingContact.updatedAt,
    };
  }
}


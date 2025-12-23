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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ListInquiriesUseCase } from '../../../application/handlers/admin/list-inquiries.use-case';
import { GetInquiryUseCase } from '../../../application/handlers/admin/get-inquiry.use-case';
import { ReplyInquiryUseCase } from '../../../application/handlers/admin/reply-inquiry.use-case';
import { ListInquiriesQueryDto } from '../dto/list-inquiries-query.dto';
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
import {
  Inquiry,
  InquiryStatus,
  InquiryCategory,
} from '../../../domain/entities/inquiry.entity';

const INQUIRY_STATUS_OPTIONS = [
  { value: InquiryStatus.PENDING, text: 'Pending' },
  { value: InquiryStatus.PROCESSING, text: 'Processing' },
  { value: InquiryStatus.CLOSED, text: 'Closed' },
  { value: InquiryStatus.RESOLVED, text: 'Resolved' },
];

const INQUIRY_CATEGORY_OPTIONS = [
  { value: InquiryCategory.INQUIRY, text: 'Inquiry' },
  { value: InquiryCategory.FEEDBACK, text: 'Feedback' },
  { value: InquiryCategory.BUG, text: 'Bug' },
  { value: InquiryCategory.ADVERTISEMENT, text: 'Advertisement' },
];

@Controller('admin/support')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSupportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listInquiriesUseCase: ListInquiriesUseCase,
    private readonly getInquiryUseCase: GetInquiryUseCase,
    private readonly replyInquiryUseCase: ReplyInquiryUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl =
      this.configService.get<string>('API_SERVICE_URL') || 'http://localhost:3000';
  }

  // ========== Inquiry Endpoints ==========
  @Get('inquiries/statuses')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.view')
  async getInquiryStatuses(): Promise<ApiResponse<any>> {
    return ApiResponseUtil.success(INQUIRY_STATUS_OPTIONS);
  }

  @Get('inquiry-categories')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.view')
  async getInquiryCategories(): Promise<ApiResponse<any>> {
    return ApiResponseUtil.success(INQUIRY_CATEGORY_OPTIONS);
  }

  @Get('inquiries')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.view')
  async listInquiries(@Query() query: ListInquiriesQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listInquiriesUseCase.execute({
      filters: {
        userName: query.userName,
        status: query.status,
        category: query.category,
        adminName: query.adminName,
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
  async getInquiry(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const inquiry = await this.getInquiryUseCase.execute(id);
    return ApiResponseUtil.success(this.mapInquiryToResponse(inquiry));
  }

  @Put('inquiries/:id/reply')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('support.inquiry.reply')
  async replyInquiry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: ReplyInquiryDto,
  ): Promise<ApiResponse<any>> {
    const inquiry = await this.replyInquiryUseCase.execute({
      inquiryId: id,
      adminId: admin.adminId,
      reply: dto.reply,
      status: dto.status,
    });

    return ApiResponseUtil.success(
      this.mapInquiryToResponse(inquiry),
      'Inquiry replied successfully',
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
      title: inquiry.title,
      category: inquiry.category,
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
}

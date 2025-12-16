import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateInquiryUseCase } from '../../../application/handlers/user/create-inquiry.use-case';
import { CreateFeedbackUseCase } from '../../../application/handlers/user/create-feedback.use-case';
import { CreateBugReportUseCase } from '../../../application/handlers/user/create-bug-report.use-case';
import { CreateAdvertisingContactUseCase } from '../../../application/handlers/user/create-advertising-contact.use-case';
import { UpdateUserInquiryUseCase } from '../../../application/handlers/user/update-user-inquiry.use-case';
import { ListUserInquiriesUseCase } from '../../../application/handlers/user/list-user-inquiries.use-case';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateBugReportDto } from '../dto/create-bug-report.dto';
import { CreateAdvertisingContactDto } from '../dto/create-advertising-contact.dto';
import { UpdateInquiryDto } from '../dto/update-inquiry.dto';
import { ListUserInquiriesQueryDto } from '../dto/list-user-inquiries-query.dto';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('api/support')
@UseGuards(JwtAuthGuard)
export class UserSupportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createInquiryUseCase: CreateInquiryUseCase,
    private readonly createFeedbackUseCase: CreateFeedbackUseCase,
    private readonly createBugReportUseCase: CreateBugReportUseCase,
    private readonly createAdvertisingContactUseCase: CreateAdvertisingContactUseCase,
    private readonly updateUserInquiryUseCase: UpdateUserInquiryUseCase,
    private readonly listUserInquiriesUseCase: ListUserInquiriesUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || 'http://localhost:3000';
  }

  @Get('inquiries')
  @HttpCode(HttpStatus.OK)
  async listMyInquiries(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListUserInquiriesQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listUserInquiriesUseCase.execute({
      userId: user.userId,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((inquiry) => ({
        id: inquiry.id,
        message: inquiry.message,
        images: inquiry.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
        status: inquiry.status,
        adminReply: inquiry.adminReply,
        repliedAt: inquiry.repliedAt || undefined,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ]),
  )
  async createInquiry(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateInquiryDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid image file type. Allowed: jpg, jpeg, png, webp');
        }
        const uploadResult = await this.uploadService.uploadImage(file, { folder: 'support/inquiries' });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const inquiry = await this.createInquiryUseCase.execute({
      userId: user.userId,
      message: dto.message,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    return ApiResponseUtil.success(
      {
        id: inquiry.id,
        message: inquiry.message,
        images: inquiry.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      },
      'Inquiry created successfully',
    );
  }

  @Put('inquiries/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ]),
  )
  async updateInquiry(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInquiryDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let imageUrls: string[] | undefined;

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      imageUrls = [];
      for (const file of files.images) {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid image file type. Allowed: jpg, jpeg, png, webp');
        }
        const uploadResult = await this.uploadService.uploadImage(file, { folder: 'support/inquiries' });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const inquiry = await this.updateUserInquiryUseCase.execute({
      inquiryId: id,
      userId: user.userId,
      message: dto.message,
      images: imageUrls,
    });

    return ApiResponseUtil.success(
      {
        id: inquiry.id,
        message: inquiry.message,
        images: inquiry.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
        status: inquiry.status,
        adminReply: inquiry.adminReply,
        repliedAt: inquiry.repliedAt || undefined,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      },
      'Inquiry updated successfully',
    );
  }

  @Post('feedbacks')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ]),
  )
  async createFeedback(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFeedbackDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid image file type. Allowed: jpg, jpeg, png, webp');
        }
        const uploadResult = await this.uploadService.uploadImage(file, { folder: 'support/feedbacks' });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const feedback = await this.createFeedbackUseCase.execute({
      userId: user.userId,
      message: dto.message,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    return ApiResponseUtil.success(
      {
        id: feedback.id,
        message: feedback.message,
        images: feedback.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
        isViewed: feedback.isViewed,
        createdAt: feedback.createdAt,
      },
      'Feedback submitted successfully',
    );
  }

  @Post('bug-reports')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ]),
  )
  async createBugReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBugReportDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid image file type. Allowed: jpg, jpeg, png, webp');
        }
        const uploadResult = await this.uploadService.uploadImage(file, { folder: 'support/bug-reports' });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const bugReport = await this.createBugReportUseCase.execute({
      userId: user.userId,
      message: dto.message,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    return ApiResponseUtil.success(
      {
        id: bugReport.id,
        message: bugReport.message,
        images: bugReport.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
        isViewed: bugReport.isViewed,
        createdAt: bugReport.createdAt,
      },
      'Bug report submitted successfully',
    );
  }

  @Post('advertising-contacts')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ]),
  )
  async createAdvertisingContact(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAdvertisingContactDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid image file type. Allowed: jpg, jpeg, png, webp');
        }
        const uploadResult = await this.uploadService.uploadImage(file, { folder: 'support/advertising-contacts' });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const advertisingContact = await this.createAdvertisingContactUseCase.execute({
      userId: user.userId,
      message: dto.message,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    return ApiResponseUtil.success(
      {
        id: advertisingContact.id,
        message: advertisingContact.message,
        images: advertisingContact.images?.map((img) => buildFullUrl(this.apiServiceUrl, img)) || [],
        isViewed: advertisingContact.isViewed,
        createdAt: advertisingContact.createdAt,
      },
      'Advertising contact submitted successfully',
    );
  }
}

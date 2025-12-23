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
import { UpdateUserInquiryUseCase } from '../../../application/handlers/user/update-user-inquiry.use-case';
import { ListUserInquiriesUseCase } from '../../../application/handlers/user/list-user-inquiries.use-case';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
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
import { InquiryCategory } from '../../../domain/entities/inquiry.entity';

@Controller('api/support')
export class UserSupportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createInquiryUseCase: CreateInquiryUseCase,
    private readonly updateUserInquiryUseCase: UpdateUserInquiryUseCase,
    private readonly listUserInquiriesUseCase: ListUserInquiriesUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl =
      this.configService.get<string>('API_SERVICE_URL') || 'http://localhost:3000';
  }

  @Get('inquiry-categories')
  @HttpCode(HttpStatus.OK)
  async getInquiryCategories(): Promise<ApiResponse<any>> {
    const categories = Object.values(InquiryCategory).map((value) => ({
      value,
      text: value.charAt(0).toUpperCase() + value.slice(1),
    }));
    return ApiResponseUtil.success(categories);
  }

  @Get('inquiries')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async listMyInquiries(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListUserInquiriesQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listUserInquiriesUseCase.execute({
      userId: user.userId,
      status: query.status,
      category: query.category,
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((inquiry) => ({
        id: inquiry.id,
        title: inquiry.title,
        category: inquiry.category,
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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  async createInquiry(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateInquiryDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    const imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 20 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 20MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException(
            'Invalid image file type. Allowed: jpg, jpeg, png, webp',
          );
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'support/inquiries',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const inquiry = await this.createInquiryUseCase.execute({
      userId: user.userId,
      title: dto.title,
      category: dto.category,
      message: dto.message,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    return ApiResponseUtil.success(
      {
        id: inquiry.id,
        title: inquiry.title,
        category: inquiry.category,
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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
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
        if (file.size > 20 * 1024 * 1024) {
          throw new BadRequestException('Image file size exceeds 20MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException(
            'Invalid image file type. Allowed: jpg, jpeg, png, webp',
          );
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'support/inquiries',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const inquiry = await this.updateUserInquiryUseCase.execute({
      inquiryId: id,
      userId: user.userId,
      title: dto.title,
      category: dto.category,
      message: dto.message,
      images: imageUrls,
    });

    return ApiResponseUtil.success(
      {
        id: inquiry.id,
        title: inquiry.title,
        category: inquiry.category,
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
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { ListScamReportsUseCase } from '../../../application/handlers/list-scam-reports.use-case';
import { GetScamReportUseCase } from '../../../application/handlers/get-scam-report.use-case';
import { ApproveScamReportUseCase } from '../../../application/handlers/approve-scam-report.use-case';
import { RejectScamReportUseCase } from '../../../application/handlers/reject-scam-report.use-case';
import { AdminCreateScamReportUseCase } from '../../../application/handlers/admin-create-scam-report.use-case';
import { AdminUpdateScamReportUseCase } from '../../../application/handlers/admin-update-scam-report.use-case';
import { AdminDeleteScamReportUseCase } from '../../../application/handlers/admin-delete-scam-report.use-case';
import { ScamReportResponseDto } from '../dto/scam-report-response.dto';
import { AdminCreateScamReportDto } from '../dto/admin-create-scam-report.dto';
import { AdminUpdateScamReportDto } from '../dto/admin-update-scam-report.dto';
import { ApproveScamReportDto } from '../dto/approve-scam-report.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import {
  ScamReport,
  ScamReportStatus,
} from '../../../domain/entities/scam-report.entity';
import { ConfigService } from '@nestjs/config';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';

@Controller('admin/scam-reports')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminScamReportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listScamReportsUseCase: ListScamReportsUseCase,
    private readonly getScamReportUseCase: GetScamReportUseCase,
    private readonly approveScamReportUseCase: ApproveScamReportUseCase,
    private readonly rejectScamReportUseCase: RejectScamReportUseCase,
    private readonly adminCreateScamReportUseCase: AdminCreateScamReportUseCase,
    private readonly adminUpdateScamReportUseCase: AdminUpdateScamReportUseCase,
    private readonly adminDeleteScamReportUseCase: AdminDeleteScamReportUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapScamReportToResponse(
    report: ScamReport & {
      likeCount?: number;
      dislikeCount?: number;
      images?: {
        id: string;
        imageUrl: string;
        order: number;
        createdAt: Date;
      }[];
      user?: {
        displayName?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
        userBadges?: {
          badge: { name: string; iconUrl?: string | null; deletedAt?: Date | null };
          active: boolean;
          earnedAt?: Date;
        }[];
      } | null;
      site?: {
        name?: string | null;
      } | null;
      admin?: {
        displayName?: string | null;
      } | null;
    },
  ): ScamReportResponseDto {
    // Use reaction counts from database (counted via subquery)
    const reactions = {
      like: report.likeCount || 0,
      dislike: report.dislikeCount || 0,
    };

    return {
      id: report.id,
      siteId: report.siteId || null,
      siteSlug: report.site?.slug || null,
      title: report.title || null,
      siteUrl: report.siteUrl,
      siteName: report.siteName || report.site?.name || null,
      siteAccountInfo: report.siteAccountInfo,
      registrationUrl: report.registrationUrl,
      contact: report.contact,
      userId: report.userId,
      userName: report.user?.displayName || null,
      userEmail: report.user?.email || null,
      userAvatarUrl: buildFullUrl(this.apiServiceUrl, report.user?.avatarUrl || null),
      userBadge: (() => {
        const activeBadge = report.user?.userBadges?.find(
          (ub) => ub?.badge && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl: buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null),
          iconName: activeBadge.badge.iconName || null,
          color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
          description: activeBadge.badge.description || null,
          obtain: activeBadge.badge.obtain || null,
        };
      })(),
      description: report.description,
      amount: report.amount ? Number(report.amount) : null,
      status: report.status,
      images: (report.images || []).map((img) => ({
        id: img.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl),
        order: img.order,
        createdAt: img.createdAt,
      })),
      reactions,
      adminId: report.adminId || null,
      adminName: report.admin?.displayName || null,
      reviewedAt: report.reviewedAt || null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.read')
  async listScamReports(
    @Query('status') status?: string,
    @Query('siteId') siteId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.listScamReportsUseCase.execute({
      siteId,
      status: status as ScamReportStatus | undefined,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((report) => this.mapScamReportToResponse(report)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.read')
  async getScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const report = await this.getScamReportUseCase.execute({
      reportId: id,
      isAdmin: true,
    });

    return ApiResponseUtil.success(this.mapScamReportToResponse(report));
  }

  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.moderate')
  async approveScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApproveScamReportDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const fullReport = await this.approveScamReportUseCase.execute({
      reportId: id,
      adminId: admin.adminId,
      title: dto.title,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(fullReport),
      MessageKeys.SCAM_REPORT_APPROVED_SUCCESS,
    );
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.moderate')
  async rejectScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const fullReport = await this.rejectScamReportUseCase.execute({
      reportId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(fullReport),
      MessageKeys.SCAM_REPORT_REJECTED_SUCCESS,
    );
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('scam-reports.moderate')
  async createScamReport(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminCreateScamReportDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 20 * 1024 * 1024) {
          throw badRequest(MessageKeys.IMAGE_FILE_SIZE_EXCEEDS_LIMIT, {
            maxSize: '20MB',
          });
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw badRequest(MessageKeys.INVALID_IMAGE_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'scam-reports',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const report = await this.adminCreateScamReportUseCase.execute({
      adminId: admin.adminId,
      siteId: dto.siteId,
      title: dto.title,
      siteUrl: dto.siteUrl,
      siteName: dto.siteName,
      siteAccountInfo: dto.siteAccountInfo,
      registrationUrl: dto.registrationUrl,
      contact: dto.contact,
      description: dto.description,
      amount: dto.amount,
      status: dto.status,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    // Reload with relations for response
    const fullReport = await this.getScamReportUseCase.execute({
      reportId: report.id,
      isAdmin: true,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(fullReport),
      MessageKeys.SCAM_REPORT_CREATED_SUCCESS,
    );
  }

  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.moderate')
  async updateScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminUpdateScamReportDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    let imageUrls: string[] | undefined;

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      imageUrls = [];
      for (const file of files.images) {
        // Validate file
        if (file.size > 20 * 1024 * 1024) {
          throw badRequest(MessageKeys.IMAGE_FILE_SIZE_EXCEEDS_LIMIT, {
            maxSize: '20MB',
          });
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw badRequest(MessageKeys.INVALID_IMAGE_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'scam-reports',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const fullReport = await this.adminUpdateScamReportUseCase.execute({
      reportId: id,
      adminId: admin.adminId,
      title: dto.title,
      siteId: dto.siteId,
      siteUrl: dto.siteUrl,
      siteName: dto.siteName,
      siteAccountInfo: dto.siteAccountInfo,
      registrationUrl: dto.registrationUrl,
      contact: dto.contact,
      description: dto.description,
      amount: dto.amount,
      status: dto.status,
      images: imageUrls,
      deleteImages: dto.deleteImages,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(fullReport),
      MessageKeys.SCAM_REPORT_UPDATED_SUCCESS,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.moderate')
  async deleteScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.adminDeleteScamReportUseCase.execute({
      reportId: id,
    });

    return ApiResponseUtil.success(
      null,
      MessageKeys.SCAM_REPORT_DELETED_SUCCESS,
    );
  }
}

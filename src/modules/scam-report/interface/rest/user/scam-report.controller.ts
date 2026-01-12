import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { CreateScamReportUseCase } from '../../../application/handlers/create-scam-report.use-case';
import { ListScamReportsUseCase } from '../../../application/handlers/list-scam-reports.use-case';
import { GetScamReportUseCase } from '../../../application/handlers/get-scam-report.use-case';
import { UpdateScamReportUseCase } from '../../../application/handlers/update-scam-report.use-case';
import { DeleteScamReportUseCase } from '../../../application/handlers/delete-scam-report.use-case';
import { AddCommentUseCase } from '../../../application/handlers/add-comment.use-case';
import { DeleteCommentUseCase } from '../../../application/handlers/delete-comment.use-case';
import { ListScamReportCommentsUseCase } from '../../../application/handlers/list-scam-report-comments.use-case';
import { ReactToScamReportUseCase } from '../../../application/handlers/react-to-scam-report.use-case';
import { CreateScamReportDto } from '../dto/create-scam-report.dto';
import { UpdateScamReportDto } from '../dto/update-scam-report.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { ReactToScamReportDto } from '../dto/react-to-scam-report.dto';
import {
  ScamReportResponseDto,
  ScamReportCommentResponseDto,
} from '../dto/scam-report-response.dto';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { ScamReportStatus } from '../../../domain/entities/scam-report.entity';
import { ListScamReportsQueryDto } from '../dto/list-scam-reports-query.dto';
import { Request } from 'express';
import { getClientIp } from '../../../../../shared/utils/request.util';
import { ListMyScamReportsUseCase } from '../../../application/handlers/list-my-scam-reports.use-case';

@Controller('api/scam-reports')
export class ScamReportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createScamReportUseCase: CreateScamReportUseCase,
    private readonly listScamReportsUseCase: ListScamReportsUseCase,
    private readonly listMyScamReportsUseCase: ListMyScamReportsUseCase,
    private readonly getScamReportUseCase: GetScamReportUseCase,
    private readonly updateScamReportUseCase: UpdateScamReportUseCase,
    private readonly deleteScamReportUseCase: DeleteScamReportUseCase,
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly listScamReportCommentsUseCase: ListScamReportCommentsUseCase,
    private readonly reactToScamReportUseCase: ReactToScamReportUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapScamReportToResponse(report: any): ScamReportResponseDto {
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
      userAvatarUrl: buildFullUrl(this.apiServiceUrl, report.user?.avatarUrl || null),
      userBadge: (() => {
        const activeBadge = report.user?.userBadges?.find(
          (ub: any) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl: buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null),
          iconName: activeBadge.badge.iconName || null,
          color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
        };
      })(),
      userEmail: report.user?.email || null,
      description: report.description,
      amount: report.amount ? Number(report.amount) : null,
      status: report.status,
      images: (report.images || []).map((img: any) => ({
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

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @HttpCode(HttpStatus.CREATED)
  async createScamReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateScamReportDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
    @Req() req?: Request,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 20 * 1024 * 1024) {
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
            fileType: 'image',
            maxSize: '20MB',
          });
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'scam-reports',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const ipAddress = req ? getClientIp(req) : undefined;

    const report = await this.createScamReportUseCase.execute({
      userId: user.userId,
      siteId: dto.siteId,
      siteUrl: dto.siteUrl,
      siteName: dto.siteName,
      siteAccountInfo: dto.siteAccountInfo,
      registrationUrl: dto.registrationUrl,
      contact: dto.contact,
      description: dto.description,
      amount: dto.amount,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      ipAddress,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(report),
      MessageKeys.SCAM_REPORT_CREATED_SUCCESS,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listScamReports(
    @Query() query: ListScamReportsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listScamReportsUseCase.execute({
      siteName: query.siteName,
      status: ScamReportStatus.PUBLISHED, // Always filter by published for public API
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((report) => this.mapScamReportToResponse(report)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('my-scam-reports')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async listMyScamReports(
    @CurrentUser() user: CurrentUserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.listMyScamReportsUseCase.execute({
      userId: user.userId,
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
  async getScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const report = await this.getScamReportUseCase.execute({
      reportId: id,
      userId: user?.userId,
      isAdmin: false,
    });

    return ApiResponseUtil.success(this.mapScamReportToResponse(report));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @HttpCode(HttpStatus.OK)
  async updateScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateScamReportDto,
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
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
            fileType: 'image',
            maxSize: '20MB',
          });
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'scam-reports',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const report = await this.updateScamReportUseCase.execute({
      reportId: id,
      userId: user.userId,
      description: dto.description,
      amount: dto.amount,
      images: imageUrls,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(report),
      MessageKeys.SCAM_REPORT_UPDATED_SUCCESS,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteScamReportUseCase.execute({
      reportId: id,
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      null,
      MessageKeys.SCAM_REPORT_DELETED_SUCCESS,
    );
  }

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  async listComments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('parentCommentId') parentCommentId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const result = await this.listScamReportCommentsUseCase.execute({
      reportId: id,
      parentCommentId: parentCommentId || undefined,
      userId: user?.userId,
      isAdmin: false,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        images: (comment.images || []).map((img: any) => ({
          id: img.id,
          imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl),
          order: img.order,
        })),
        userId: comment.userId,
        userName: comment.user?.displayName || null,
        userEmail: comment.user?.email || null,
        userAvatarUrl: buildFullUrl(this.apiServiceUrl, comment.user?.avatarUrl || null),
        userBadge: (() => {
          const activeBadge = comment.user?.userBadges?.find(
            (ub) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
          );
          if (!activeBadge) return null;
          return {
            name: activeBadge.badge.name,
            iconUrl:
              buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) || null,
            color: activeBadge.badge.color || null,
            earnedAt: activeBadge.earnedAt,
          };
        })(),
        parentCommentId: comment.parentCommentId || null,
        hasChild: comment.hasChild || false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddCommentDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<ScamReportCommentResponseDto>> {
    const imageUrls: string[] = [];

    // Upload images if provided
    if (files?.images && files.images.length > 0) {
      for (const file of files.images) {
        // Validate file
        if (file.size > 20 * 1024 * 1024) {
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
            fileType: 'image',
            maxSize: '20MB',
          });
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'scam-reports/comments',
        });
        imageUrls.push(uploadResult.relativePath);
      }
    }

    const comment = await this.addCommentUseCase.execute({
      reportId: id,
      userId: user.userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    return ApiResponseUtil.success(
      {
        id: comment.id,
        content: comment.content,
        images: (comment.images || []).map((img: any) => ({
          id: img.id,
          imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl),
          order: img.order,
        })),
        userId: comment.userId,
        userName: comment.user?.displayName || null,
        userEmail: comment.user?.email || null,
        userAvatarUrl: buildFullUrl(this.apiServiceUrl, comment.user?.avatarUrl || null),
        userBadge: (() => {
          const activeBadge = comment.user?.userBadges?.find(
            (ub) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
          );
          if (!activeBadge) return null;
          return {
            name: activeBadge.badge.name,
            iconUrl:
              buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) || null,
            color: activeBadge.badge.color || null,
            earnedAt: activeBadge.earnedAt,
          };
        })(),
        parentCommentId: comment.parentCommentId || null,
        hasChild: comment.hasChild || false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      },
      'Comment added successfully',
    );
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteCommentUseCase.execute({
      commentId,
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      null,
      MessageKeys.COMMENT_DELETED_SUCCESS,
    );
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactToScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReactToScamReportDto,
  ): Promise<ApiResponse<any>> {
    const reaction = await this.reactToScamReportUseCase.execute({
      reportId: id,
      userId: user.userId,
      reactionType: dto.reactionType,
    });

    return ApiResponseUtil.success(
      {
        id: reaction.id,
        reactionType: reaction.reactionType,
      },
      'Reaction added successfully',
    );
  }
}

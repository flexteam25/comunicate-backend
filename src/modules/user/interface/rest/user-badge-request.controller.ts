import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../shared/decorators/current-user.decorator';
import { CreateUserBadgeRequestUseCase } from '../../application/handlers/user/create-user-badge-request.use-case';
import { ListUserBadgeRequestsUseCase } from '../../application/handlers/user/list-user-badge-requests.use-case';
import { CancelUserBadgeRequestUseCase } from '../../application/handlers/user/cancel-user-badge-request.use-case';
import { CreateUserBadgeRequestDto } from './dto/create-user-badge-request.dto';
import { ListUserBadgeRequestsQueryDto } from './dto/list-user-badge-requests-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';
import { UserBadgeRequest } from '../../domain/entities/user-badge-request.entity';
import { MulterFile } from '../../../../shared/services/upload';

@Controller('api/me/badge-requests')
@UseGuards(JwtAuthGuard)
export class UserBadgeRequestController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createUserBadgeRequestUseCase: CreateUserBadgeRequestUseCase,
    private readonly listUserBadgeRequestsUseCase: ListUserBadgeRequestsUseCase,
    private readonly cancelUserBadgeRequestUseCase: CancelUserBadgeRequestUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapBadgeRequestToResponse(request: UserBadgeRequest): any {
    return {
      id: request.id,
      userId: request.userId,
      badgeId: request.badgeId,
      adminId: request.adminId || null,
      status: request.status,
      note: request.note || null,
      content: request.content || null,
      images: (request.images || []).map((img) => ({
        id: img.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl) || null,
        order: img.order || null,
      })),
      badge: request.badge
        ? {
            id: request.badge.id,
            name: request.badge.name,
            description: request.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, request.badge.iconUrl || null) || null,
            iconName: request.badge.iconName || null,
          }
        : null,
      admin: request.admin
        ? {
            id: request.admin.id,
            email: request.admin.email,
            displayName: request.admin.displayName || null,
          }
        : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 5 },
    ]),
  )
  async createBadgeRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateUserBadgeRequestDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    const request = await this.createUserBadgeRequestUseCase.execute({
      userId: user.userId,
      badgeId: dto.badgeId,
      content: dto.content,
      images: files?.images || [],
    });

    return ApiResponseUtil.success(this.mapBadgeRequestToResponse(request));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listBadgeRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListUserBadgeRequestsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listUserBadgeRequestsUseCase.execute({
      userId: user.userId,
      status: query.status,
      badgeName: query.badgeName,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((request) => this.mapBadgeRequestToResponse(request)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Patch(':requestId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBadgeRequest(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const request = await this.cancelUserBadgeRequestUseCase.execute({
      userId: user.userId,
      requestId,
    });

    return ApiResponseUtil.success(this.mapBadgeRequestToResponse(request));
  }
}

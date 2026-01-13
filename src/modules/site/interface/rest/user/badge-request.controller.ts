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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { CreateBadgeRequestUseCase } from '../../../application/handlers/user/create-badge-request.use-case';
import { ListBadgeRequestsUseCase } from '../../../application/handlers/user/list-badge-requests.use-case';
import { CancelBadgeRequestUseCase } from '../../../application/handlers/user/cancel-badge-request.use-case';
import { CreateBadgeRequestDto } from '../dto/create-badge-request.dto';
import { ListBadgeRequestsQueryDto } from '../dto/list-badge-requests-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { SiteBadgeRequest } from '../../../domain/entities/site-badge-request.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';

@Controller('api/site-managers')
@UseGuards(JwtAuthGuard)
export class BadgeRequestController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createBadgeRequestUseCase: CreateBadgeRequestUseCase,
    private readonly listBadgeRequestsUseCase: ListBadgeRequestsUseCase,
    private readonly cancelBadgeRequestUseCase: CancelBadgeRequestUseCase,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapBadgeRequestToResponse(request: SiteBadgeRequest): any {
    return {
      id: request.id,
      siteId: request.siteId,
      badgeId: request.badgeId,
      userId: request.userId,
      adminId: request.adminId || null,
      status: request.status,
      note: request.note || null,
      site: request.site
        ? {
            id: request.site.id,
            name: request.site.name,
            slug: request.site.slug,
          }
        : null,
      badge: request.badge
        ? {
            id: request.badge.id,
            name: request.badge.name,
            description: request.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, request.badge.iconUrl || null) || null,
            iconName: request.badge.iconName || null,
          }
        : null,
      user: request.user
        ? {
            id: request.user.id,
            email: request.user.email,
            displayName: request.user.displayName || null,
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

  @Post('sites/:siteId/badge-requests')
  @HttpCode(HttpStatus.CREATED)
  async createBadgeRequest(
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBadgeRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.createBadgeRequestUseCase.execute({
      userId: user.userId,
      siteId,
      badgeId: dto.badgeId,
    });

    const response = this.mapBadgeRequestToResponse(request);

    // Publish event to admin room (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SITE_BADGE_REQUEST_CREATED as string, response)
        .catch((error) => {
          this.logger.error(
            'Failed to publish site-badge-request:created event',
            {
              error: error instanceof Error ? error.message : String(error),
              requestId: request.id,
              userId: user.userId,
            },
            'site',
          );
        });
    });

    return ApiResponseUtil.success(response);
  }

  @Get('badge-requests')
  @HttpCode(HttpStatus.OK)
  async listBadgeRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListBadgeRequestsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listBadgeRequestsUseCase.execute({
      userId: user.userId,
      siteId: query.siteId,
      status: query.status,
      siteName: query.siteName,
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

  @Patch('badge-requests/:requestId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBadgeRequest(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const request = await this.cancelBadgeRequestUseCase.execute({
      userId: user.userId,
      requestId,
    });

    const response = this.mapBadgeRequestToResponse(request);

    // Publish event to admin room (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SITE_BADGE_REQUEST_CANCELLED as string, response)
        .catch((error) => {
          this.logger.error(
            'Failed to publish site-badge-request:cancelled event',
            {
              error: error instanceof Error ? error.message : String(error),
              requestId: request.id,
              userId: user.userId,
            },
            'site',
          );
        });
    });

    return ApiResponseUtil.success(response);
  }
}

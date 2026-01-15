import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { ListAllUserBadgeRequestsUseCase } from '../../../application/handlers/admin/list-all-user-badge-requests.use-case';
import { ApproveUserBadgeRequestUseCase } from '../../../application/handlers/admin/approve-user-badge-request.use-case';
import { RejectUserBadgeRequestUseCase } from '../../../application/handlers/admin/reject-user-badge-request.use-case';
import { ListUserBadgeRequestsQueryDto } from '../dto/list-user-badge-requests-query.dto';
import { ApproveUserBadgeRequestDto } from '../dto/approve-user-badge-request.dto';
import { RejectUserBadgeRequestDto } from '../dto/reject-user-badge-request.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { UserBadgeRequest } from '../../../domain/entities/user-badge-request.entity';

@Controller('admin/user-badge-requests')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminUserBadgeRequestController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listAllUserBadgeRequestsUseCase: ListAllUserBadgeRequestsUseCase,
    private readonly approveUserBadgeRequestUseCase: ApproveUserBadgeRequestUseCase,
    private readonly rejectUserBadgeRequestUseCase: RejectUserBadgeRequestUseCase,
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
      user: request.user
        ? {
            id: request.user.id,
            email: request.user.email,
            displayName: request.user.displayName || null,
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

  @Get()
  @RequirePermission('users.manage')
  @HttpCode(HttpStatus.OK)
  async listBadgeRequests(
    @Query() query: ListUserBadgeRequestsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listAllUserBadgeRequestsUseCase.execute({
      status: query.status,
      userName: query.userName,
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

  @Post(':requestId/approve')
  @RequirePermission('users.manage')
  @HttpCode(HttpStatus.OK)
  async approveBadgeRequest(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: ApproveUserBadgeRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.approveUserBadgeRequestUseCase.execute({
      requestId,
      adminId: admin.adminId,
      note: dto.note,
      handlePoint: dto.handlePoint,
    });

    return ApiResponseUtil.success(this.mapBadgeRequestToResponse(request));
  }

  @Post(':requestId/reject')
  @RequirePermission('users.manage')
  @HttpCode(HttpStatus.OK)
  async rejectBadgeRequest(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: RejectUserBadgeRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.rejectUserBadgeRequestUseCase.execute({
      requestId,
      adminId: admin.adminId,
      note: dto.note,
    });

    return ApiResponseUtil.success(this.mapBadgeRequestToResponse(request));
  }
}

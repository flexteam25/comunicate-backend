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
import { ListPartnerRequestsUseCase } from '../../../application/handlers/admin/list-partner-requests.use-case';
import { ApprovePartnerRequestUseCase } from '../../../application/handlers/admin/approve-partner-request.use-case';
import { RejectPartnerRequestUseCase } from '../../../application/handlers/admin/reject-partner-request.use-case';
import { ListPartnerUsersUseCase } from '../../../application/handlers/admin/list-partner-users.use-case';
import { ListPartnerRequestsQueryDto } from '../dto/list-partner-requests-query.dto';
import { RejectPartnerRequestDto } from '../dto/reject-partner-request.dto';
import { ListPartnerUsersQueryDto } from '../dto/list-partner-users-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('admin/partner')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminPartnerController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listPartnerRequestsUseCase: ListPartnerRequestsUseCase,
    private readonly approvePartnerRequestUseCase: ApprovePartnerRequestUseCase,
    private readonly rejectPartnerRequestUseCase: RejectPartnerRequestUseCase,
    private readonly listPartnerUsersUseCase: ListPartnerUsersUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Get('requests')
  @RequirePermission('partner.manage')
  @HttpCode(HttpStatus.OK)
  async listPartnerRequests(
    @Query() query: ListPartnerRequestsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listPartnerRequestsUseCase.execute({
      status: query.status,
      userId: query.userId,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((request) => ({
        id: request.id,
        userId: request.userId,
        userName: request.user?.displayName || null,
        userEmail: request.user?.email || null,
        userAvatar: buildFullUrl(this.apiServiceUrl, request.user?.avatarUrl || null) || null,
        status: request.status,
        adminId: request.adminId || null,
        adminName: request.admin?.displayName || null,
        reviewedAt: request.reviewedAt || null,
        rejectionReason: request.rejectionReason || null,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post('requests/:id/approve')
  @RequirePermission('partner.manage')
  @HttpCode(HttpStatus.OK)
  async approvePartnerRequest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const partnerRequest = await this.approvePartnerRequestUseCase.execute({
      requestId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      {
        id: partnerRequest.id,
        userId: partnerRequest.userId,
        userName: partnerRequest.user?.displayName || null,
        userEmail: partnerRequest.user?.email || null,
        status: partnerRequest.status,
        adminId: partnerRequest.adminId || null,
        adminName: partnerRequest.admin?.displayName || null,
        reviewedAt: partnerRequest.reviewedAt || null,
        createdAt: partnerRequest.createdAt,
        updatedAt: partnerRequest.updatedAt,
      },
      'Partner request approved successfully',
    );
  }

  @Post('requests/:id/reject')
  @RequirePermission('partner.manage')
  @HttpCode(HttpStatus.OK)
  async rejectPartnerRequest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectPartnerRequestDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const partnerRequest = await this.rejectPartnerRequestUseCase.execute({
      requestId: id,
      adminId: admin.adminId,
      rejectionReason: dto.rejectionReason,
    });

    return ApiResponseUtil.success(
      {
        id: partnerRequest.id,
        userId: partnerRequest.userId,
        userName: partnerRequest.user?.displayName || null,
        userEmail: partnerRequest.user?.email || null,
        status: partnerRequest.status,
        adminId: partnerRequest.adminId || null,
        adminName: partnerRequest.admin?.displayName || null,
        reviewedAt: partnerRequest.reviewedAt || null,
        rejectionReason: partnerRequest.rejectionReason || null,
        createdAt: partnerRequest.createdAt,
        updatedAt: partnerRequest.updatedAt,
      },
      'Partner request rejected successfully',
    );
  }

  private mapUserRoles(user: { userRoles?: Array<{ role?: { name: string } }> }): string {
    const roles: string[] = [];
    if (user.userRoles) {
      for (const userRole of user.userRoles) {
        if (userRole?.role?.name) {
          roles.push(userRole.role.name);
        }
      }
    }
    return roles.join(',');
  }

  @Get('users')
  @RequirePermission('partner.manage')
  @HttpCode(HttpStatus.OK)
  async listPartnerUsers(
    @Query() query: ListPartnerUsersQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listPartnerUsersUseCase.execute({
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName || null,
        avatarUrl: buildFullUrl(this.apiServiceUrl, user.avatarUrl || null) || null,
        roles: this.mapUserRoles(user),
        bio: user.userProfile?.bio || null,
        phone: user.userProfile?.phone || null,
        sites: (result.sitesByUserId?.[user.id] || []).map((site) => ({
          id: site.id,
          slug: site.slug,
          name: site.name,
          category: site.category
            ? {
                id: site.category.id,
                name: site.category.name,
                nameKo: (site.category as any).nameKo || null,
                description: site.category.description || null,
              }
            : { id: '', name: '' },
          logoUrl: buildFullUrl(this.apiServiceUrl, site.logoUrl || null) || null,
          mainImageUrl: buildFullUrl(this.apiServiceUrl, site.mainImageUrl || null) || null,
          siteImageUrl: buildFullUrl(this.apiServiceUrl, site.siteImageUrl || null) || null,
          tier: site.tier
            ? {
                id: site.tier.id,
                name: site.tier.name,
                description: site.tier.description || null,
                order: site.tier.order,
                iconUrl: buildFullUrl(this.apiServiceUrl, (site.tier as any).iconUrl || null) || null,
                iconName: (site.tier as any).iconName || null,
              }
            : null,
          permanentUrl: site.permanentUrl || null,
          accessibleUrl: site.accessibleUrl || null,
          status: site.status,
          tetherDepositWithdrawalStatus: site.tetherDepositWithdrawalStatus,
        })),
        createdAt: user.createdAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }
}

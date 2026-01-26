import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
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
import { ListSiteRequestsUseCase } from '../../../application/handlers/admin/list-site-requests.use-case';
import { GetSiteRequestUseCase } from '../../../application/handlers/user/get-site-request.use-case';
import { ApproveSiteRequestUseCase } from '../../../application/handlers/admin/approve-site-request.use-case';
import { RejectSiteRequestUseCase } from '../../../application/handlers/admin/reject-site-request.use-case';
import { ListSiteRequestsQueryDto } from '../dto/list-site-requests-query.dto';
import { ApproveSiteRequestDto } from '../dto/approve-site-request.dto';
import { RejectSiteRequestDto } from '../dto/reject-site-request.dto';
import { SiteRequestResponseDto } from '../dto/site-request-response.dto';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('admin/site-requests')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSiteRequestController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listSiteRequestsUseCase: ListSiteRequestsUseCase,
    private readonly getSiteRequestUseCase: GetSiteRequestUseCase,
    private readonly approveSiteRequestUseCase: ApproveSiteRequestUseCase,
    private readonly rejectSiteRequestUseCase: RejectSiteRequestUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site-request.read')
  async listSiteRequests(@Query() query: ListSiteRequestsQueryDto): Promise<
    ApiResponse<{
      requests: SiteRequestResponseDto[];
      nextCursor: string | null;
      hasMore: boolean;
    }>
  > {
    // Parse dates if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (query.startDate) {
      startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        startDate = undefined;
      }
    }

    if (query.endDate) {
      endDate = new Date(query.endDate);
      if (isNaN(endDate.getTime())) {
        endDate = undefined;
      }
      // Set end date to end of day
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const result = await this.listSiteRequestsUseCase.execute({
      status: query.status,
      userName: query.userName,
      startDate,
      endDate,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      requests: result.requests.map((r) => this.mapSiteRequestToResponse(r)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site-request.read')
  async getSiteRequest(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<SiteRequestResponseDto>> {
    // Admin can view any request, so don't pass userId
    const request = await this.getSiteRequestUseCase.execute({
      requestId: id,
    });

    return ApiResponseUtil.success(this.mapSiteRequestToResponse(request));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site-request.approve')
  async approveSiteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveSiteRequestDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<SiteRequestResponseDto>> {
    const request = await this.approveSiteRequestUseCase.execute({
      requestId: id,
      adminId: admin.adminId,
      slug: dto.slug,
      status: dto.status as any,
      tierId: dto.tierId,
      categoryId: dto.categoryId,
    });

    return ApiResponseUtil.success(
      this.mapSiteRequestToResponse(request),
      'Site request approved successfully',
    );
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site-request.reject')
  async rejectSiteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSiteRequestDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<SiteRequestResponseDto>> {
    const request = await this.rejectSiteRequestUseCase.execute({
      requestId: id,
      adminId: admin.adminId,
      rejectionReason: dto.rejectionReason,
    });

    return ApiResponseUtil.success(
      this.mapSiteRequestToResponse(request),
      'Site request rejected successfully',
    );
  }

  private mapSiteRequestToResponse(request: any): SiteRequestResponseDto {
    return {
      id: request.id,
      userId: request.userId,
      user: request.user
        ? {
            id: request.user.id,
            email: request.user.email,
            displayName: request.user.displayName || null,
            avatarUrl:
              buildFullUrl(this.apiServiceUrl, request.user.avatarUrl || null) || null,
          }
        : undefined,
      name: request.name,
      slug: request.slug || null,
      categoryId: request.categoryId,
      category: request.category
        ? {
            id: request.category.id,
            name: request.category.name,
            nameKo: request.category.nameKo || null,
            description: request.category.description || null,
          }
        : undefined,
      logoUrl: buildFullUrl(this.apiServiceUrl, request.logoUrl || null) || null,
      mainImageUrl:
        buildFullUrl(this.apiServiceUrl, request.mainImageUrl || null) || null,
      siteImageUrl:
        buildFullUrl(this.apiServiceUrl, request.siteImageUrl || null) || null,
      tierId: request.tierId || null,
      tier: request.tier
        ? {
            id: request.tier.id,
            name: request.tier.name,
            description: request.tier.description || null,
            order: request.tier.order,
          }
        : undefined,
      permanentUrl: request.permanentUrl || null,
      accessibleUrl: request.accessibleUrl || null,
      csMessenger: request.csMessenger,
      description: request.description || null,
      firstCharge: request.firstCharge || null,
      recharge: request.recharge || null,
      experience: request.experience,
      status: request.status,
      siteId: request.siteId || null,
      site: request.site ? this.mapSiteToResponse(request.site) : undefined,
      adminId: request.adminId || null,
      admin: request.admin
        ? {
            id: request.admin.id,
            email: request.admin.email,
            displayName: request.admin.displayName || null,
          }
        : undefined,
      rejectionReason: request.rejectionReason || null,
      ipAddress: request.ipAddress || null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private mapSiteToResponse(site: any): any {
    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      category: site.category
        ? {
            id: site.category.id,
            name: site.category.name,
            nameKo: site.category.nameKo || null,
            description: site.category.description || null,
          }
        : {
            id: '',
            name: '',
            nameKo: null,
          },
      logoUrl: buildFullUrl(this.apiServiceUrl, site.logoUrl || null) || null,
      mainImageUrl: buildFullUrl(this.apiServiceUrl, site.mainImageUrl || null) || null,
      siteImageUrl: buildFullUrl(this.apiServiceUrl, site.siteImageUrl || null) || null,
      tier: site.tier
        ? {
            id: site.tier.id,
            name: site.tier.name,
            description: site.tier.description || null,
            order: site.tier.order,
          }
        : null,
      permanentUrl: site.permanentUrl || null,
      status: site.status,
      description: site.description || null,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      firstCharge: site.firstCharge ? Number(site.firstCharge) : null,
      recharge: site.recharge ? Number(site.recharge) : null,
      experience: site.experience,
      issueCount: site.issueCount || 0,
      badges: (site.siteBadges || [])
        .map((sb: any) => {
          // Filter out if badge is null or deleted
          if (!sb.badge || sb.badge.deletedAt) {
            return null;
          }
          return {
            id: sb.badge.id,
            name: sb.badge.name,
            description: sb.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || null,
            iconName: sb.badge.iconName || null,
          };
        })
        .filter((badge: any): badge is NonNullable<typeof badge> => badge !== null),
      domains: (site.siteDomains || []).map((sd: any) => ({
        id: sd.id,
        domain: sd.domain,
        isActive: sd.isActive,
        isCurrent: sd.isCurrent,
      })),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }
}

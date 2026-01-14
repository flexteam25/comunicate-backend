import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateSiteUseCase } from '../../../application/handlers/admin/create-site.use-case';
import { UpdateSiteUseCase } from '../../../application/handlers/admin/update-site.use-case';
import { DeleteSiteUseCase } from '../../../application/handlers/admin/delete-site.use-case';
import { ListSitesUseCase } from '../../../application/handlers/admin/list-sites.use-case';
import { GetSiteUseCase } from '../../../application/handlers/admin/get-site.use-case';
import { AssignBadgeToSiteUseCase } from '../../../application/handlers/admin/assign-badge.use-case';
import { RemoveBadgeFromSiteUseCase } from '../../../application/handlers/admin/remove-badge.use-case';
import { CreateSiteDto } from '../dto/create-site.dto';
import { UpdateSiteDto } from '../dto/update-site.dto';
import { ListSitesQueryDto } from '../dto/list-sites-query.dto';
import { AssignBadgeDto } from '../dto/assign-badge.dto';
import { CreateSiteDomainDto } from '../dto/create-site-domain.dto';
import { UpdateSiteDomainDto } from '../dto/update-site-domain.dto';
import { SiteResponse, CursorPaginatedSitesResponse } from '../dto/site-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ConfigService } from '@nestjs/config';
import {
  Site,
  TetherDepositWithdrawalStatus,
} from '../../../domain/entities/site.entity';
import { MulterFile } from '../../../../../shared/services/upload';
import { SiteManager } from '../../../../site-manager/domain/entities/site-manager.entity';
import { RestoreSiteUseCase } from '../../../application/handlers/admin/restore-site.use-case';
import { AddSiteDomainUseCase } from '../../../application/handlers/admin/add-site-domain.use-case';
import { UpdateSiteDomainUseCase } from '../../../application/handlers/admin/update-site-domain.use-case';
import { DeleteSiteDomainUseCase } from '../../../application/handlers/admin/delete-site-domain.use-case';
import { ListAllBadgeRequestsUseCase } from '../../../application/handlers/admin/list-all-badge-requests.use-case';
import { ApproveBadgeRequestUseCase } from '../../../application/handlers/admin/approve-badge-request.use-case';
import { RejectBadgeRequestUseCase } from '../../../application/handlers/admin/reject-badge-request.use-case';
import { ListAllBadgeRequestsQueryDto } from '../dto/list-all-badge-requests-query.dto';
import { RejectBadgeRequestDto } from '../dto/reject-badge-request.dto';
import { ApproveBadgeRequestDto } from '../dto/approve-badge-request.dto';
import { SiteBadgeRequest } from '../../../domain/entities/site-badge-request.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';

@Controller('admin/sites')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSiteController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createSiteUseCase: CreateSiteUseCase,
    private readonly updateSiteUseCase: UpdateSiteUseCase,
    private readonly deleteSiteUseCase: DeleteSiteUseCase,
    private readonly listSitesUseCase: ListSitesUseCase,
    private readonly getSiteUseCase: GetSiteUseCase,
    private readonly assignBadgeUseCase: AssignBadgeToSiteUseCase,
    private readonly removeBadgeUseCase: RemoveBadgeFromSiteUseCase,
    private readonly configService: ConfigService,
    private readonly restoreSiteUseCase: RestoreSiteUseCase,
    private readonly addSiteDomainUseCase: AddSiteDomainUseCase,
    private readonly updateSiteDomainUseCase: UpdateSiteDomainUseCase,
    private readonly deleteSiteDomainUseCase: DeleteSiteDomainUseCase,
    private readonly listAllBadgeRequestsUseCase: ListAllBadgeRequestsUseCase,
    private readonly approveBadgeRequestUseCase: ApproveBadgeRequestUseCase,
    private readonly rejectBadgeRequestUseCase: RejectBadgeRequestUseCase,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapSiteToResponse(site: Site): SiteResponse {
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
            iconUrl: buildFullUrl(this.apiServiceUrl, site.tier.iconUrl || null) || null,
            iconName: site.tier.iconName || null,
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
      tetherDepositWithdrawalStatus: site.tetherDepositWithdrawalStatus,
      badges: (site.siteBadges || [])
        .map((sb) => {
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
            color: sb.badge.color || null,
          };
        })
        .filter((badge): badge is NonNullable<typeof badge> => badge !== null),
      domains: (site.siteDomains || []).map((sd) => ({
        id: sd.id,
        domain: sd.domain,
        isActive: sd.isActive,
        isCurrent: sd.isCurrent,
      })),
      managers: ((site.siteManagers || []) as SiteManager[])
        .filter((sm) => sm.user)
        .map((sm) => ({
          id: sm.user.id,
          email: sm.user.email,
          displayName: sm.user.displayName || undefined,
          avatarUrl: buildFullUrl(this.apiServiceUrl, sm.user.avatarUrl || null) || null,
          badge: (() => {
            const activeBadge = sm.user?.userBadges?.find(
              (ub) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
            );
            if (!activeBadge) return null;
            return {
              name: activeBadge.badge.name,
              iconUrl:
                buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) ||
                null,
              color: activeBadge.badge.color || null,
              earnedAt: activeBadge.earnedAt,
              description: activeBadge.badge.description || null,
              obtain: activeBadge.badge.obtain || null,
            };
          })(),
        })),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'mainImage', maxCount: 1 },
      { name: 'siteImage', maxCount: 1 },
    ]),
  )
  async createSite(
    @Body() dto: CreateSiteDto,
    @UploadedFiles()
    files?: {
      logo?: MulterFile[];
      mainImage?: MulterFile[];
      siteImage?: MulterFile[];
    },
  ): Promise<ApiResponse<SiteResponse>> {
    const site = await this.createSiteUseCase.execute({
      name: dto.name,
      slug: dto.slug,
      categoryId: dto.categoryId,
      tierId: dto.tierId,
      permanentUrl: dto.permanentUrl,
      description: dto.description,
      firstCharge: dto.firstCharge,
      recharge: dto.recharge,
      experience: dto.experience,
      partnerUid: dto.partnerUid,
      tetherDepositWithdrawalStatus: dto.tetherDepositWithdrawalStatus,
      logo: files?.logo?.[0],
      mainImage: files?.mainImage?.[0],
      siteImage: files?.siteImage?.[0],
    });

    return ApiResponseUtil.success(
      this.mapSiteToResponse(site),
      MessageKeys.SITE_CREATED_SUCCESS,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listSites(
    @Query() query: ListSitesQueryDto,
  ): Promise<ApiResponse<CursorPaginatedSitesResponse>> {
    const result = await this.listSitesUseCase.execute({
      filters: {
        categoryId: query.categoryId,
        tierId: query.tierId,
        status: query.status,
        search: query.search,
        categoryType: query.categoryType,
        filterBy: query.filterBy,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ApiResponseUtil.success({
      data: result.data.map((site) => this.mapSiteToResponse(site)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('tether-status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  getTetherStatusOptions(): ApiResponse<
    { value: TetherDepositWithdrawalStatus; label: string; labelKo: string }[]
  > {
    const options = [
      {
        value: TetherDepositWithdrawalStatus.POSSIBLE,
        label: 'Possible',
        labelKo: '테더입출금 가능시',
      },
      {
        value: TetherDepositWithdrawalStatus.NOT_POSSIBLE,
        label: 'Not Possible',
        labelKo: '불가능시',
      },
      {
        value: TetherDepositWithdrawalStatus.NO_INFO,
        label: 'No Information',
        labelKo: '정보 없음',
      },
    ];

    return ApiResponseUtil.success(options);
  }

  @Get('badge-requests')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async listAllBadgeRequests(
    @Query() query: ListAllBadgeRequestsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listAllBadgeRequestsUseCase.execute({
      siteName: query.siteName,
      badgeName: query.badgeName,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((request) => this.mapBadgeRequestToResponse(request)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async getSite(@Param('id') id: string): Promise<ApiResponse<SiteResponse>> {
    const site = await this.getSiteUseCase.execute({ siteId: id });
    return ApiResponseUtil.success(this.mapSiteToResponse(site));
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'mainImage', maxCount: 1 },
      { name: 'siteImage', maxCount: 1 },
    ]),
  )
  async updateSite(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSiteDto,
    @UploadedFiles()
    files?: {
      logo?: MulterFile[];
      mainImage?: MulterFile[];
      siteImage?: MulterFile[];
    },
  ): Promise<ApiResponse<SiteResponse>> {
    const site = await this.updateSiteUseCase.execute({
      siteId: id,
      name: dto.name,
      slug: dto.slug,
      categoryId: dto.categoryId,
      tierId: dto.tierId,
      permanentUrl: dto.permanentUrl,
      description: dto.description,
      status: dto.status,
      firstCharge: dto.firstCharge,
      recharge: dto.recharge,
      experience: dto.experience,
      logo: files?.logo?.[0],
      mainImage: files?.mainImage?.[0],
      siteImage: files?.siteImage?.[0],
      deleteLogo: dto.deleteLogo === 'true',
      deleteMainImage: dto.deleteMainImage === 'true',
      deleteSiteImage: dto.deleteSiteImage === 'true',
      partnerUid: dto.partnerUid,
      removePartnerUid: dto.removePartnerUid,
      tetherDepositWithdrawalStatus: dto.tetherDepositWithdrawalStatus,
    });
    return ApiResponseUtil.success(
      this.mapSiteToResponse(site),
      'Site updated successfully',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.delete')
  async deleteSite(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteSiteUseCase.execute({ siteId: id });
    return ApiResponseUtil.success(
      null,
      MessageKeys.SITE_DELETED_SUCCESS,
    );
  }

  @Put('restore/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async restoreSite(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteResponse>> {
    const site = await this.restoreSiteUseCase.execute({ siteId: id });
    return ApiResponseUtil.success(
      this.mapSiteToResponse(site),
      MessageKeys.SITE_RESTORED_SUCCESS,
    );
  }

  @Post(':id/domains')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.update')
  async addDomain(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateSiteDomainDto,
  ): Promise<ApiResponse> {
    await this.addSiteDomainUseCase.execute({
      siteId: id,
      domain: dto.domain,
      isActive: dto.isActive,
      isCurrent: dto.isCurrent,
    });
    return ApiResponseUtil.success(null, MessageKeys.DOMAIN_ADDED_SUCCESS);
  }

  @Put(':id/domains/:domainId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async updateDomain(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('domainId', new ParseUUIDPipe()) domainId: string,
    @Body() dto: UpdateSiteDomainDto,
  ): Promise<ApiResponse> {
    await this.updateSiteDomainUseCase.execute({
      siteId: id,
      domainId,
      domain: dto.domain,
      isActive: dto.isActive,
      isCurrent: dto.isCurrent,
    });
    return ApiResponseUtil.success(null, MessageKeys.DOMAIN_UPDATED_SUCCESS);
  }

  @Delete(':id/domains/:domainId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async deleteDomain(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('domainId', new ParseUUIDPipe()) domainId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteSiteDomainUseCase.execute({
      siteId: id,
      domainId,
    });
    return ApiResponseUtil.success(null, MessageKeys.DOMAIN_DELETED_SUCCESS);
  }

  @Post(':id/badges')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.update')
  async assignBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignBadgeDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.assignBadgeUseCase.execute({ siteId: id, badgeId: dto.badgeId });
    return ApiResponseUtil.success(
      null,
      MessageKeys.SITE_BADGE_ASSIGNED_SUCCESS,
    );
  }

  @Delete(':id/badges/:badgeId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async removeBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('badgeId', new ParseUUIDPipe()) badgeId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.removeBadgeUseCase.execute({ siteId: id, badgeId });
    return ApiResponseUtil.success(null, MessageKeys.SITE_BADGE_REMOVED_SUCCESS);
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

  @Patch('badge-requests/:requestId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async approveBadgeRequest(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: ApproveBadgeRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.approveBadgeRequestUseCase.execute({
      requestId,
      adminId: admin.adminId,
      note: dto.note,
    });

    const response = this.mapBadgeRequestToResponse(request);

    // Publish event to user room and admin room (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SITE_BADGE_REQUEST_APPROVED as string, response)
        .catch((error) => {
          this.logger.error(
            'Failed to publish site-badge-request:approved event',
            {
              error: error instanceof Error ? error.message : String(error),
              requestId: request.id,
              userId: request.userId,
            },
            'site',
          );
        });
    });

    return ApiResponseUtil.success(response);
  }

  @Patch('badge-requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async rejectBadgeRequest(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: RejectBadgeRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.rejectBadgeRequestUseCase.execute({
      requestId,
      adminId: admin.adminId,
      note: dto.note,
    });

    const response = this.mapBadgeRequestToResponse(request);

    // Publish event to user room and admin room (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SITE_BADGE_REQUEST_REJECTED as string, response)
        .catch((error) => {
          this.logger.error(
            'Failed to publish site-badge-request:rejected event',
            {
              error: error instanceof Error ? error.message : String(error),
              requestId: request.id,
              userId: request.userId,
            },
            'site',
          );
        });
    });

    return ApiResponseUtil.success(response);
  }
}

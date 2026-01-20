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
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { ApplySiteManagerUseCase } from '../../../application/handlers/apply-site-manager.use-case';
import { ListMyApplicationsUseCase } from '../../../application/handlers/user/list-my-applications.use-case';
import { GetManagedSitesUseCase } from '../../../application/handlers/user/get-managed-sites.use-case';
import { UpdateManagedSiteUseCase } from '../../../application/handlers/user/update-managed-site.use-case';
import { ApplySiteManagerDto } from '../dto/apply-site-manager.dto';
import { UpdateManagedSiteDto } from '../dto/update-managed-site.dto';
import { ListMyApplicationsQueryDto } from '../dto/list-my-applications-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { MulterFile } from '../../../../../shared/services/upload';
import { Site } from '../../../../site/domain/entities/site.entity';
import { SiteResponse } from '../../../../site/interface/rest/dto/site-response.dto';

@Controller('api/site-management')
@UseGuards(JwtAuthGuard)
export class SiteManagerController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly applySiteManagerUseCase: ApplySiteManagerUseCase,
    private readonly listMyApplicationsUseCase: ListMyApplicationsUseCase,
    private readonly getManagedSitesUseCase: GetManagedSitesUseCase,
    private readonly updateManagedSiteUseCase: UpdateManagedSiteUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapApplicationToResponse(app: any): any {
    return {
      id: app.id,
      siteId: app.siteId,
      siteName: app.site?.name || null,
      userId: app.userId,
      userName: app.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, app.user?.avatarUrl || null) || null,
      domain: app.domain || null,
      accountId: app.accountId || null,
      accountPassword: app.accountPassword || null,
      message: app.message || null,
      status: app.status,
      adminId: app.adminId || null,
      adminName: app.admin?.displayName || null,
      reviewedAt: app.reviewedAt || null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
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
      accessibleUrl: site.accessibleUrl || null,
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
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }

  private mapManagedSiteToResponse(manager: any): SiteResponse {
    return this.mapSiteToResponse(manager.site);
  }

  @Post(':siteId/manager-applications')
  @HttpCode(HttpStatus.CREATED)
  async applySiteManager(
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ApplySiteManagerDto,
  ): Promise<ApiResponse<any>> {
    const application = await this.applySiteManagerUseCase.execute({
      userId: user.userId,
      siteId,
      domain: dto.domain,
      accountId: dto.accountId,
      accountPassword: dto.accountPassword,
      message: dto.message,
    });

    return ApiResponseUtil.success(
      this.mapApplicationToResponse(application),
      'Application submitted successfully',
    );
  }

  @Get('my-managed-sites')
  @HttpCode(HttpStatus.OK)
  async getManagedSites(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any[]>> {
    const managers = await this.getManagedSitesUseCase.execute({
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      managers.map((manager) => this.mapManagedSiteToResponse(manager)),
    );
  }

  @Put(':siteId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'mainImage', maxCount: 1 },
      { name: 'siteImage', maxCount: 1 },
    ]),
  )
  async updateManagedSite(
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateManagedSiteDto,
    @UploadedFiles()
    files?: {
      logo?: MulterFile[];
      mainImage?: MulterFile[];
      siteImage?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    const site = await this.updateManagedSiteUseCase.execute({
      userId: user.userId,
      siteId,
      name: dto.name,
      slug: dto.slug,
      categoryId: dto.categoryId,
      tierId: dto.tierId,
      permanentUrl: dto.permanentUrl,
      accessibleUrl: dto.accessibleUrl,
      description: dto.description,
      firstCharge: dto.firstCharge,
      recharge: dto.recharge,
      experience: dto.experience,
      logo: files?.logo?.[0],
      mainImage: files?.mainImage?.[0],
      siteImage: files?.siteImage?.[0],
      deleteLogo: dto.deleteLogo === 'true',
      deleteMainImage: dto.deleteMainImage === 'true',
      deleteSiteImage: dto.deleteSiteImage === 'true',
    });

    return ApiResponseUtil.success(
      this.mapSiteToResponse(site),
      'Site updated successfully',
    );
  }
}

@Controller('api/manager-applications')
@UseGuards(JwtAuthGuard)
export class ManagerApplicationController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listMyApplicationsUseCase: ListMyApplicationsUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapApplicationToResponse(app: any): any {
    return {
      id: app.id,
      siteId: app.siteId,
      siteName: app.site?.name || null,
      userId: app.userId,
      userName: app.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, app.user?.avatarUrl || null) || null,
      domain: app.domain || null,
      accountId: app.accountId || null,
      accountPassword: app.accountPassword || null,
      message: app.message || null,
      status: app.status,
      adminId: app.adminId || null,
      adminName: app.admin?.displayName || null,
      reviewedAt: app.reviewedAt || null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  @Get('my-submissions')
  @HttpCode(HttpStatus.OK)
  async listMyApplications(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListMyApplicationsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listMyApplicationsUseCase.execute({
      userId: user.userId,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((app) => this.mapApplicationToResponse(app)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }
}

import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ListSitesUseCase } from '../../../application/handlers/user/list-sites.use-case';
import { GetSiteUseCase } from '../../../application/handlers/user/get-site.use-case';
import { ListCategoriesUseCase } from '../../../application/handlers/user/list-categories.use-case';
import { ListSitesQueryDto } from '../dto/list-sites-query.dto';
import { SiteResponse, CursorPaginatedSitesResponse } from '../dto/site-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../../../../shared/guards/optional-jwt-auth.guard';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { getClientIp } from '../../../../../shared/utils/request.util';
import { ConfigService } from '@nestjs/config';
import { Site } from '../../../domain/entities/site.entity';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { ListScamReportsUseCase } from '../../../../scam-report/application/handlers/list-scam-reports.use-case';
import { ScamReportStatus } from '../../../../scam-report/domain/entities/scam-report.entity';

@Controller('api/sites')
export class UserSiteController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listSitesUseCase: ListSitesUseCase,
    private readonly getSiteUseCase: GetSiteUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly listScamReportsUseCase: ListScamReportsUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapSiteToResponse(site: Site): SiteResponse {
    return {
      id: site.id,
      name: site.name,
      category: site.category
        ? {
            id: site.category.id,
            name: site.category.name,
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
            color: site.tier.color || null,
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

  @Get()
  @HttpCode(HttpStatus.OK)
  async listSites(
    @Query() query: ListSitesQueryDto,
  ): Promise<ApiResponse<CursorPaginatedSitesResponse>> {
    const result = await this.listSitesUseCase.execute({
      filters: {
        categoryId: query.categoryId,
        tierId: query.tierId,
        search: query.search,
        categoryType: query.categoryType,
        filterBy: query.filterBy,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    const sites = result.data.map((site) => this.mapSiteToResponse(site));

    // Group sites by tier for easier consumption on the client side
    const groupsMap = new Map<
      string,
      {
        tier: SiteResponse['tier'] | null;
        sites: SiteResponse[];
      }
    >();

    for (const site of sites) {
      const key = site.tier?.id ?? 'no-tier';
      let group = groupsMap.get(key);

      if (!group) {
        group = {
          tier: site.tier ?? null,
          sites: [],
        };
        groupsMap.set(key, group);
      }

      group.sites.push(site);
    }

    const groupedByTier = Array.from(groupsMap.values()).sort((a, b) => {
      // Keep sites without tier at the end
      if (!a.tier && !b.tier) return 0;
      if (!a.tier) return 1;
      if (!b.tier) return -1;
      return (a.tier.order ?? 0) - (b.tier.order ?? 0);
    });

    return ApiResponseUtil.success({
      data: sites,
      groupedByTier,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async listCategories(): Promise<ApiResponse<SiteCategory[]>> {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseUtil.success(categories);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async getSite(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<SiteResponse>> {
    const ipAddress = getClientIp(req);
    const userId = user?.userId;

    const site = await this.getSiteUseCase.execute({
      siteId: id,
      userId,
      ipAddress,
    });

    return ApiResponseUtil.success(this.mapSiteToResponse(site));
  }

  @Get(':id/scam-reports')
  @HttpCode(HttpStatus.OK)
  async listSiteScamReports(
    @Param('id', new ParseUUIDPipe()) siteId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.listScamReportsUseCase.execute({
      siteId,
      status: ScamReportStatus.PUBLISHED,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    // Map scam reports to response (reuse logic from scam-report controller)
    const mapScamReportToResponse = (report: any) => {
      // Use reaction counts from database (counted via subquery)
      const reactions = {
        like: report.likeCount || 0,
        dislike: report.dislikeCount || 0,
      };

      return {
        id: report.id,
        siteId: report.siteId || null,
        siteUrl: report.siteUrl,
        siteName: report.siteName,
        siteAccountInfo: report.siteAccountInfo,
        registrationUrl: report.registrationUrl,
        contact: report.contact,
        userId: report.userId,
        userName: report.user?.displayName || null,
        userEmail: report.user?.email || null,
        userAvatarUrl: buildFullUrl(this.apiServiceUrl, report.user?.avatarUrl || null),
        userBadges: report.user?.userBadges?.map((ub) => ({
          name: ub.badge.name,
          iconUrl: buildFullUrl(this.apiServiceUrl, ub.badge.iconUrl || null),
        })) || [],
        title: report.title,
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
    };

    return ApiResponseUtil.success({
      data: result.data.map((report) => mapScamReportToResponse(report)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }
}

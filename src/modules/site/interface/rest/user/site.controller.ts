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
import { ConfigService } from '@nestjs/config';
import { Site } from '../../../domain/entities/site.entity';
import { SiteCategory } from '../../../domain/entities/site-category.entity';

@Controller('api/sites')
export class UserSiteController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listSitesUseCase: ListSitesUseCase,
    private readonly getSiteUseCase: GetSiteUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
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
      badges: (site.siteBadges || []).map((sb) => ({
        id: sb.badge.id,
        name: sb.badge.name,
        description: sb.badge.description || null,
        iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || null,
      })),
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
    const ipAddress = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    const userId = user?.userId;

    const site = await this.getSiteUseCase.execute({
      siteId: id,
      userId,
      ipAddress,
    });

    return ApiResponseUtil.success(this.mapSiteToResponse(site));
  }
}

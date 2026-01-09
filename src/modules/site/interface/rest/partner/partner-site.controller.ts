import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { CreatePartnerSiteUseCase } from '../../../application/handlers/partner/create-partner-site.use-case';
import { CreateSiteDto } from '../dto/create-site.dto';
import { SiteResponse } from '../dto/site-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ConfigService } from '@nestjs/config';
import { MulterFile } from '../../../../../shared/services/upload';
import { Site } from '../../../domain/entities/site.entity';
import { SiteManager } from '../../../../site-manager/domain/entities/site-manager.entity';

@Controller('api/partner/sites')
@UseGuards(JwtAuthGuard)
export class PartnerSiteController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createPartnerSiteUseCase: CreatePartnerSiteUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'mainImage', maxCount: 1 },
      { name: 'siteImage', maxCount: 1 },
    ]),
  )
  async createSite(
    @Body() dto: CreateSiteDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFiles()
    files?: {
      logo?: MulterFile[];
      mainImage?: MulterFile[];
      siteImage?: MulterFile[];
    },
  ): Promise<ApiResponse<SiteResponse>> {
    const site = await this.createPartnerSiteUseCase.execute({
      userId: user.userId,
      name: dto.name,
      slug: dto.slug,
      categoryId: dto.categoryId,
      logo: files?.logo?.[0],
      mainImage: files?.mainImage?.[0],
      siteImage: files?.siteImage?.[0],
      tierId: dto.tierId,
      permanentUrl: dto.permanentUrl,
      description: dto.description,
      firstCharge: dto.firstCharge,
      recharge: dto.recharge,
      experience: dto.experience,
    });

    return ApiResponseUtil.success(
      this.mapSiteToResponse(site),
      'Site created successfully',
    );
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
            iconName: sb.badge.iconName || null,
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
              earnedAt: activeBadge.earnedAt,
            };
          })(),
        })),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }
}

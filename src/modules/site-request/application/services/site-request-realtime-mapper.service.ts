import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';
import { SiteRequest } from '../../domain/entities/site-request.entity';
import { Site } from '../../../site/domain/entities/site.entity';
import { SiteRequestResponseDto } from '../../interface/rest/dto/site-request-response.dto';

/**
 * Shared mapper for SiteRequest realtime payloads.
 * Goal: keep realtime event payload 100% identical to API response format.
 */
@Injectable()
export class SiteRequestRealtimeMapper {
  private readonly apiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  mapSiteRequestToResponse(request: any): SiteRequestResponseDto {
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

  private mapSiteToResponse(site: Site): any {
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
          if (!sb.badge || sb.badge.deletedAt) return null;
          return {
            id: sb.badge.id,
            name: sb.badge.name,
            description: sb.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || null,
            iconName: sb.badge.iconName || null,
          };
        })
        .filter((b: any) => b !== null),
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

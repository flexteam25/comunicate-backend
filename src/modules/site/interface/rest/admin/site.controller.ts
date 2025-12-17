import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
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
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ConfigService } from '@nestjs/config';
import { Site } from '../../../domain/entities/site.entity';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { RestoreSiteUseCase } from '../../../application/handlers/admin/restore-site.use-case';
import { AddSiteDomainUseCase } from '../../../application/handlers/admin/add-site-domain.use-case';
import { UpdateSiteDomainUseCase } from '../../../application/handlers/admin/update-site-domain.use-case';
import { DeleteSiteDomainUseCase } from '../../../application/handlers/admin/delete-site-domain.use-case';

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
    private readonly uploadService: UploadService,
    private readonly restoreSiteUseCase: RestoreSiteUseCase,
    private readonly addSiteDomainUseCase: AddSiteDomainUseCase,
    private readonly updateSiteDomainUseCase: UpdateSiteDomainUseCase,
    private readonly deleteSiteDomainUseCase: DeleteSiteDomainUseCase,
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
            description: site.category.description || undefined,
          }
        : ({} as any),
      logoUrl: buildFullUrl(this.apiServiceUrl, site.logoUrl || null) || undefined,
      mainImageUrl: buildFullUrl(this.apiServiceUrl, site.mainImageUrl || null) || undefined,
      siteImageUrl: buildFullUrl(this.apiServiceUrl, site.siteImageUrl || null) || undefined,
      tier: site.tier
        ? {
            id: site.tier.id,
            name: site.tier.name,
            description: site.tier.description || undefined,
            order: site.tier.order,
            color: site.tier.color || undefined,
          }
        : undefined,
      permanentUrl: site.permanentUrl || undefined,
      status: site.status,
      description: site.description || undefined,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      badges: (site.siteBadges || []).map((sb) => ({
        id: sb.badge.id,
        name: sb.badge.name,
        description: sb.badge.description || undefined,
        iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || undefined,
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
    // Create site first
    const site = await this.createSiteUseCase.execute(dto);

    // Upload images if provided
    let logoUrl: string | undefined;
    let mainImageUrl: string | undefined;
    let siteImageUrl: string | undefined;

    if (files) {
      // Upload logo
      if (files.logo && files.logo[0]) {
        const file = files.logo[0];
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Logo file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid logo file type. Allowed: jpg, jpeg, png, webp');
        }
        const logoResult = await this.uploadService.uploadSiteImage(file, site.id, 'logo');
        logoUrl = logoResult.relativePath;
      }

      // Upload main image
      if (files.mainImage && files.mainImage[0]) {
        const file = files.mainImage[0];
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Main image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException(
            'Invalid main image file type. Allowed: jpg, jpeg, png, webp',
          );
        }
        const mainImageResult = await this.uploadService.uploadSiteImage(
          files.mainImage[0],
          site.id,
          'main',
        );
        mainImageUrl = mainImageResult.relativePath;
      }

      // Upload site image
      if (files.siteImage && files.siteImage[0]) {
        const file = files.siteImage[0];
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Site image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException(
            'Invalid site image file type. Allowed: jpg, jpeg, png, webp',
          );
        }
        const siteImageResult = await this.uploadService.uploadSiteImage(
          files.siteImage[0],
          site.id,
          'site',
        );
        siteImageUrl = siteImageResult.relativePath;
      }

      // Update site with image URLs
      if (logoUrl || mainImageUrl || siteImageUrl) {
        const updatedSite = await this.updateSiteUseCase.execute({
          siteId: site.id,
          logoUrl,
          mainImageUrl,
          siteImageUrl,
        });
        return ApiResponseUtil.success(
          this.mapSiteToResponse(updatedSite),
          'Site created successfully',
        );
      }
    }

    return ApiResponseUtil.success(this.mapSiteToResponse(site), 'Site created successfully');
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listSites(@Query() query: ListSitesQueryDto): Promise<ApiResponse<CursorPaginatedSitesResponse>> {
    const result = await this.listSitesUseCase.execute({
      filters: {
        categoryId: query.categoryId,
        tierId: query.tierId,
        status: query.status,
        search: query.search,
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async getSite(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteResponse>> {
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
    // Upload images if provided
    let logoUrl: string | undefined;
    let mainImageUrl: string | undefined;
    let siteImageUrl: string | undefined;

    if (files) {
      // Upload logo
      if (files.logo && files.logo[0]) {
        const file = files.logo[0];
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Logo file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException('Invalid logo file type. Allowed: jpg, jpeg, png, webp');
        }
        const logoResult = await this.uploadService.uploadSiteImage(file, id, 'logo');
        logoUrl = logoResult.relativePath;
      }

      // Upload main image
      if (files.mainImage && files.mainImage[0]) {
        const file = files.mainImage[0];
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Main image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException(
            'Invalid main image file type. Allowed: jpg, jpeg, png, webp',
          );
        }
        const mainImageResult = await this.uploadService.uploadSiteImage(
          files.mainImage[0],
          id,
          'main',
        );
        mainImageUrl = mainImageResult.relativePath;
      }

      // Upload site image
      if (files.siteImage && files.siteImage[0]) {
        const file = files.siteImage[0];
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Site image file size exceeds 5MB');
        }
        if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
          throw new BadRequestException(
            'Invalid site image file type. Allowed: jpg, jpeg, png, webp',
          );
        }
        const siteImageResult = await this.uploadService.uploadSiteImage(
          files.siteImage[0],
          id,
          'site',
        );
        siteImageUrl = siteImageResult.relativePath;
      }
    }

    // Update site with all data
    const site = await this.updateSiteUseCase.execute({
      siteId: id,
      ...dto,
      logoUrl,
      mainImageUrl,
      siteImageUrl,
    });
    return ApiResponseUtil.success(this.mapSiteToResponse(site), 'Site updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.delete')
  async deleteSite(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteSiteUseCase.execute({ siteId: id });
    return ApiResponseUtil.success({ message: 'Site deleted successfully' });
  }

  @Put('restore/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async restoreSite(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteResponse>> {
    const site = await this.restoreSiteUseCase.execute({ siteId: id });
    return ApiResponseUtil.success(this.mapSiteToResponse(site), 'Site restored successfully');
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
    return ApiResponseUtil.success(null, 'Domain added successfully');
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
    return ApiResponseUtil.success(null, 'Domain updated successfully');
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
    return ApiResponseUtil.success(null, 'Domain deleted successfully');
  }

  @Post(':id/badges')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.update')
  async assignBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignBadgeDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.assignBadgeUseCase.execute({ siteId: id, badgeId: dto.badgeId });
    return ApiResponseUtil.success({ message: 'Badge assigned successfully' });
  }

  @Delete(':id/badges/:badgeId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async removeBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('badgeId', new ParseUUIDPipe()) badgeId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.removeBadgeUseCase.execute({ siteId: id, badgeId });
    return ApiResponseUtil.success({ message: 'Badge removed successfully' });
  }
}

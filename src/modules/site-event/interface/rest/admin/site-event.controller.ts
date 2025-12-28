import {
  Controller,
  Get,
  Post,
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
import { MulterFile } from '../../../../../shared/services/upload';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { CreateSiteEventUseCase } from '../../../application/handlers/admin/create-site-event.use-case';
import { UpdateSiteEventUseCase } from '../../../application/handlers/admin/update-site-event.use-case';
import { ListSiteEventsUseCase } from '../../../application/handlers/admin/list-site-events.use-case';
import { GetSiteEventUseCase } from '../../../application/handlers/admin/get-site-event.use-case';
import { CreateSiteEventDto } from '../dto/create-site-event.dto';
import { UpdateSiteEventDto } from '../dto/update-site-event.dto';
import { ListSiteEventsQueryDto } from '../dto/list-site-events-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('admin/site-events')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSiteEventController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createSiteEventUseCase: CreateSiteEventUseCase,
    private readonly updateSiteEventUseCase: UpdateSiteEventUseCase,
    private readonly listSiteEventsUseCase: ListSiteEventsUseCase,
    private readonly getSiteEventUseCase: GetSiteEventUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapBannerToResponse(banner: any): any {
    // If banner has linkUrl, imageUrl should be null
    const imageUrl = banner.linkUrl
      ? null
      : banner.imageUrl
        ? buildFullUrl(this.apiServiceUrl, banner.imageUrl)
        : null;

    return {
      id: banner.id,
      imageUrl,
      linkUrl: banner.linkUrl || null,
      order: banner.order,
      isActive: banner.isActive,
      createdAt: banner.createdAt,
    };
  }

  private mapSiteEventToResponse(event: any): any {
    return {
      id: event.id,
      siteId: event.siteId,
      userId: event.userId || null,
      adminId: event.adminId || null,
      title: event.title,
      description: event.description || null,
      startDate: event.startDate,
      endDate: event.endDate,
      isActive: event.isActive,
      banners:
        event.banners && event.banners.length > 0
          ? event.banners
              .sort((a: any, b: any) => a.order - b.order)
              .map((banner: any) => this.mapBannerToResponse(banner))
          : [],
      viewCount: event.viewCount || 0,
      site: event.site
        ? {
            id: event.site.id,
            name: event.site.name,
            logoUrl: buildFullUrl(this.apiServiceUrl, event.site.logoUrl || null),
          }
        : null,
      user: event.user
        ? {
            id: event.user.id,
            email: event.user.email,
            displayName: event.user.displayName || null,
            avatarUrl: buildFullUrl(this.apiServiceUrl, event.user.avatarUrl || null),
          }
        : null,
      admin: event.admin
        ? {
            id: event.admin.id,
            email: event.admin.email,
            displayName: event.admin.displayName || null,
          }
        : null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  @Get()
  @RequirePermission('site.view')
  @HttpCode(HttpStatus.OK)
  async listSiteEvents(@Query() query: ListSiteEventsQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listSiteEventsUseCase.execute({
      siteName: query.siteName,
      userName: query.userName,
      adminName: query.adminName,
      isActive: query.isActive,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((event) => this.mapSiteEventToResponse(event)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('site.view')
  @HttpCode(HttpStatus.OK)
  async getSiteEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const event = await this.getSiteEventUseCase.execute({
      eventId: id,
    });

    return ApiResponseUtil.success(this.mapSiteEventToResponse(event));
  }

  @Post()
  @RequirePermission('site.create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'banners', maxCount: 10 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  async createSiteEvent(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: CreateSiteEventDto,
    @UploadedFiles()
    files?: {
      banners?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let banners:
      | Array<{ image?: MulterFile; linkUrl?: string; order: number }>
      | undefined;

    // Handle file uploads
    if (files?.banners && files.banners.length > 0) {
      banners = files.banners.map((image, index) => ({
        image,
        order: index,
      }));
    }

    // Handle link URLs (banners without file upload)
    if (dto.linkUrls && dto.linkUrls.length > 0) {
      if (!banners) {
        banners = [];
      }
      // Add link URLs as banners (use linkUrl as imageUrl)
      dto.linkUrls.forEach((linkUrl, index) => {
        const existingIndex = files?.banners ? files.banners.length + index : index;
        if (banners) {
          banners.push({
            linkUrl,
            order: existingIndex,
          });
        }
      });
    }

    const event = await this.createSiteEventUseCase.execute({
      adminId: admin.adminId,
      siteId: dto.siteId,
      title: dto.title,
      description: dto.description,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isActive: true, // Default to true for admin
      banners,
    });

    return ApiResponseUtil.success(
      this.mapSiteEventToResponse(event),
      'Event created successfully',
    );
  }

  @Put(':id')
  @RequirePermission('site.update')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'banners', maxCount: 10 },
    ]),
  )
  @HttpCode(HttpStatus.OK)
  async updateSiteEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSiteEventDto,
    @UploadedFiles()
    files?: {
      banners?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    // Only update banners if files or linkUrls are provided
    // If neither is provided, banners will be undefined (keep existing banners)
    let banners:
      | Array<{ image?: MulterFile; linkUrl?: string; order: number }>
      | undefined;

    const hasFiles = files?.banners && files.banners.length > 0;
    const hasLinkUrls =
      dto.linkUrls && Array.isArray(dto.linkUrls) && dto.linkUrls.length > 0;

    // Only set banners if files or linkUrls are provided (and not empty)
    // Skip if banners array is empty or linkUrls array is empty
    if (hasFiles || hasLinkUrls) {
      banners = [];

      // Handle file uploads
      if (hasFiles && files.banners) {
        files.banners.forEach((image, index) => {
          if (banners) {
            banners.push({
              image,
              order: index,
            });
          }
        });
      }

      // Handle link URLs (banners without file upload)
      if (hasLinkUrls && dto.linkUrls) {
        dto.linkUrls.forEach((linkUrl: string, index: number) => {
          const existingIndex = hasFiles && files?.banners ? files.banners.length + index : index;
          if (banners) {
            banners.push({
              linkUrl,
              order: existingIndex,
            });
          }
        });
      }
    }
    // If neither files nor linkUrls are provided, banners remains undefined (keep existing)

    const event = await this.updateSiteEventUseCase.execute({
      eventId: id,
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      isActive: dto.isActive,
      banners,
      deleteBannerIds:
        dto.deleteBanners && dto.deleteBanners.length > 0 ? dto.deleteBanners : undefined,
    });

    return ApiResponseUtil.success(
      this.mapSiteEventToResponse(event),
      'Event updated successfully',
    );
  }
}

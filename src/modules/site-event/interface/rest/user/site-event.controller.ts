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
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterFile } from '../../../../../shared/services/upload';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../../../shared/guards/optional-jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { CreateSiteEventUseCase } from '../../../application/handlers/user/create-site-event.use-case';
import { UpdateSiteEventUseCase } from '../../../application/handlers/user/update-site-event.use-case';
import { ListSiteEventsUseCase } from '../../../application/handlers/user/list-site-events.use-case';
import { GetSiteEventUseCase } from '../../../application/handlers/user/get-site-event.use-case';
import { CreateSiteEventDto } from '../dto/create-site-event.dto';
import { UpdateSiteEventDto } from '../dto/update-site-event.dto';
import { ListSiteEventsQueryDto } from '../dto/list-site-events-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { Request } from 'express';

@Controller('api/site-events')
export class SiteEventController {
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
    return {
      id: banner.id,
      imageUrl: buildFullUrl(this.apiServiceUrl, banner.imageUrl),
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
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async listSiteEvents(
    @Query() query: ListSiteEventsQueryDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    if (!query.siteId) {
      throw new Error('Site ID is required');
    }

    const result = await this.listSiteEventsUseCase.execute({
      siteId: query.siteId,
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
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSiteEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      undefined;

    const event = await this.getSiteEventUseCase.execute({
      eventId: id,
      userId: user?.userId,
      ipAddress,
    });

    return ApiResponseUtil.success(this.mapSiteEventToResponse(event));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'banners', maxCount: 10 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  async createSiteEvent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSiteEventDto,
    @UploadedFiles()
    files?: {
      banners?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    // Parse banners order if provided
    let banners: Array<{ image: MulterFile; linkUrl?: string; order: number }> | undefined;

    if (files?.banners && files.banners.length > 0) {
      // For now, we don't have linkUrl in DTO, so we'll use default order
      // In the future, we can add bannersData as JSON string similar to poca-event
      banners = files.banners.map((image, index) => ({
        image,
        order: index,
      }));
    }

    const event = await this.createSiteEventUseCase.execute({
      userId: user.userId,
      siteId: dto.siteId,
      title: dto.title,
      description: dto.description,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      banners,
    });

    return ApiResponseUtil.success(
      this.mapSiteEventToResponse(event),
      'Event created successfully. Waiting for admin approval.',
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'banners', maxCount: 10 },
    ]),
  )
  @HttpCode(HttpStatus.OK)
  async updateSiteEvent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSiteEventDto,
    @UploadedFiles()
    files?: {
      banners?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    let banners: Array<{ image: MulterFile; linkUrl?: string; order: number }> | undefined;

    if (files?.banners && files.banners.length > 0) {
      banners = files.banners.map((image, index) => ({
        image,
        order: index,
      }));
    }

    const event = await this.updateSiteEventUseCase.execute({
      userId: user.userId,
      eventId: id,
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      banners,
    });

    return ApiResponseUtil.success(
      this.mapSiteEventToResponse(event),
      'Event updated successfully. Waiting for admin approval.',
    );
  }
}


import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { CreateSiteRequestUseCase } from '../../../application/handlers/user/create-site-request.use-case';
import { ListSiteRequestsUseCase } from '../../../application/handlers/user/list-site-requests.use-case';
import { GetSiteRequestUseCase } from '../../../application/handlers/user/get-site-request.use-case';
import { CancelSiteRequestUseCase } from '../../../application/handlers/user/cancel-site-request.use-case';
import { CreateSiteRequestDto } from '../dto/create-site-request.dto';
import { ListSiteRequestsQueryDto } from '../dto/list-site-requests-query.dto';
import { SiteRequestResponseDto } from '../dto/site-request-response.dto';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { SiteRequestStatus } from '../../../domain/entities/site-request.entity';
import { getClientIp } from '../../../../../shared/utils/request.util';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Controller('api/site-requests')
@UseGuards(JwtAuthGuard)
export class SiteRequestController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createSiteRequestUseCase: CreateSiteRequestUseCase,
    private readonly listSiteRequestsUseCase: ListSiteRequestsUseCase,
    private readonly getSiteRequestUseCase: GetSiteRequestUseCase,
    private readonly cancelSiteRequestUseCase: CancelSiteRequestUseCase,
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
  async createSiteRequest(
    @Body() dto: CreateSiteRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
    @UploadedFiles()
    files?: {
      logo?: MulterFile[];
      mainImage?: MulterFile[];
      siteImage?: MulterFile[];
    },
  ): Promise<ApiResponse<SiteRequestResponseDto>> {
    const ipAddress = getClientIp(req);

    const request = await this.createSiteRequestUseCase.execute({
      userId: user.userId,
      name: dto.name,
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
      ipAddress,
    });

    return ApiResponseUtil.success(
      this.mapSiteRequestToResponse(request),
      MessageKeys.SITE_REQUEST_CREATED_SUCCESS,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listSiteRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListSiteRequestsQueryDto,
  ): Promise<
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
      userId: user.userId,
      status: query.status,
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
  async getSiteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<SiteRequestResponseDto>> {
    const request = await this.getSiteRequestUseCase.execute({
      requestId: id,
      userId: user.userId,
    });

    return ApiResponseUtil.success(this.mapSiteRequestToResponse(request));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSiteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<SiteRequestResponseDto>> {
    const request = await this.cancelSiteRequestUseCase.execute({
      requestId: id,
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      this.mapSiteRequestToResponse(request),
      MessageKeys.SITE_REQUEST_CANCELLED_SUCCESS,
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
            color: request.tier.color || null,
          }
        : undefined,
      permanentUrl: request.permanentUrl || null,
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
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }
}

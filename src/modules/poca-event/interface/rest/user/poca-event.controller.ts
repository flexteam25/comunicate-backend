import { Controller, Get, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { ListPocaEventsUseCase } from '../../../application/handlers/user/list-poca-events.use-case';
import { GetPocaEventUseCase } from '../../../application/handlers/user/get-poca-event.use-case';
import { ListPocaEventsQueryDto } from '../dto/list-poca-events-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../../../../shared/guards/optional-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { getClientIp } from '../../../../../shared/utils/request.util';

@Controller('api/poca-events')
@UseGuards(OptionalJwtAuthGuard)
export class PocaEventController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listPocaEventsUseCase: ListPocaEventsUseCase,
    private readonly getPocaEventUseCase: GetPocaEventUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapPocaEventToResponse(event: any): any {
    return {
      id: event.id,
      title: event.title,
      slug: event.slug || null,
      summary: event.summary || null,
      primaryBannerUrl:
        buildFullUrl(this.apiServiceUrl, event.primaryBannerUrl || null) || null,
      startsAt: event.startsAt || null,
      endsAt: event.endsAt || null,
      viewCount: event.viewCount || 0,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private mapPocaEventDetailToResponse(event: any): any {
    return {
      ...this.mapPocaEventToResponse(event),
      content: event.content,
      banners: (event.banners || []).map((banner: any) => ({
        id: banner.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, banner.imageUrl) || null,
        order: banner.order,
      })),
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listPocaEvents(
    @Query() query: ListPocaEventsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listPocaEventsUseCase.execute({
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((event) => this.mapPocaEventToResponse(event)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':idOrSlug')
  @HttpCode(HttpStatus.OK)
  async getPocaEvent(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user?: CurrentUserPayload,
    @Req() req?: Request,
  ): Promise<ApiResponse<any>> {
    const ipAddress = req ? getClientIp(req) : 'unknown';
    const userAgent = req?.headers['user-agent'] || undefined;

    const event = await this.getPocaEventUseCase.execute({
      idOrSlug,
      userId: user?.userId,
      ipAddress,
      userAgent,
    });

    return ApiResponseUtil.success(this.mapPocaEventDetailToResponse(event));
  }
}

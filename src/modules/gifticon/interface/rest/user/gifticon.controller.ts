import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ListGifticonsUseCase } from '../../../application/handlers/user/list-gifticons.use-case';
import { GetGifticonUseCase } from '../../../application/handlers/user/get-gifticon.use-case';
import { ListGifticonsQueryDto } from '../dto/list-gifticons-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('api/gifticons')
export class GifticonController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listGifticonsUseCase: ListGifticonsUseCase,
    private readonly getGifticonUseCase: GetGifticonUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapGifticonToResponse(gifticon: any): any {
    return {
      id: gifticon.id,
      title: gifticon.title,
      slug: gifticon.slug || null,
      summary: gifticon.summary || null,
      imageUrl: buildFullUrl(
        this.apiServiceUrl,
        gifticon.imageUrl || null,
      ) || null,
      amount: gifticon.amount,
      startsAt: gifticon.startsAt || null,
      endsAt: gifticon.endsAt || null,
      createdAt: gifticon.createdAt,
      updatedAt: gifticon.updatedAt,
    };
  }

  private mapGifticonDetailToResponse(gifticon: any): any {
    return {
      ...this.mapGifticonToResponse(gifticon),
      content: gifticon.content,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listGifticons(
    @Query() query: ListGifticonsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listGifticonsUseCase.execute({
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((gifticon) => this.mapGifticonToResponse(gifticon)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':idOrSlug')
  @HttpCode(HttpStatus.OK)
  async getGifticon(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<ApiResponse<any>> {
    const gifticon = await this.getGifticonUseCase.execute({ idOrSlug });

    return ApiResponseUtil.success(this.mapGifticonDetailToResponse(gifticon));
  }
}

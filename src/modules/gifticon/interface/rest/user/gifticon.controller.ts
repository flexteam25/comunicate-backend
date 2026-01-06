import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { ListGifticonsUseCase } from '../../../application/handlers/user/list-gifticons.use-case';
import { GetGifticonUseCase } from '../../../application/handlers/user/get-gifticon.use-case';
import { RedeemGifticonUseCase } from '../../../application/handlers/user/redeem-gifticon.use-case';
import { GetMyRedemptionsUseCase } from '../../../application/handlers/user/get-my-redemptions.use-case';
import { GetRedemptionDetailUseCase } from '../../../application/handlers/user/get-redemption-detail.use-case';
import { CancelRedemptionUseCase } from '../../../application/handlers/user/cancel-redemption.use-case';
import { ListGifticonsQueryDto } from '../dto/list-gifticons-query.dto';
import { GetMyRedemptionsQueryDto } from '../dto/get-my-redemptions-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { Request } from 'express';
import { getClientIp } from '../../../../../shared/utils/request.util';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('api/gifticons')
export class GifticonController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listGifticonsUseCase: ListGifticonsUseCase,
    private readonly getGifticonUseCase: GetGifticonUseCase,
    private readonly redeemGifticonUseCase: RedeemGifticonUseCase,
    private readonly getMyRedemptionsUseCase: GetMyRedemptionsUseCase,
    private readonly getRedemptionDetailUseCase: GetRedemptionDetailUseCase,
    private readonly cancelRedemptionUseCase: CancelRedemptionUseCase,
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
      imageUrl: buildFullUrl(this.apiServiceUrl, gifticon.imageUrl || null) || null,
      amount: gifticon.amount,
      typeColor: gifticon.typeColor || null,
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
  async listGifticons(@Query() query: ListGifticonsQueryDto): Promise<ApiResponse<any>> {
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

  @Get('my-redemptions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyRedemptions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetMyRedemptionsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.getMyRedemptionsUseCase.execute({
      userId: user.userId,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((redemption) => ({
        id: redemption.id,
        redemptionCode: redemption.redemptionCode || null,
        gifticon: redemption.gifticonSnapshot
          ? {
              title: redemption.gifticonSnapshot.title,
              amount: redemption.gifticonSnapshot.amount,
              imageUrl: redemption.gifticonSnapshot.imageUrl
                ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                : null,
              summary: redemption.gifticonSnapshot.summary || null,
              typeColor: redemption.gifticonSnapshot.typeColor || null,
            }
          : redemption.gifticon
            ? this.mapGifticonToResponse(redemption.gifticon)
            : null,
        pointsUsed: redemption.pointsUsed,
        status: redemption.status,
        createdAt: redemption.createdAt,
        updatedAt: redemption.updatedAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('redemptions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRedemptionDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const redemption = await this.getRedemptionDetailUseCase.execute({
      userId: user.userId,
      redemptionId: id,
    });

    return ApiResponseUtil.success({
      id: redemption.id,
      redemptionCode: redemption.redemptionCode || null,
      gifticon: redemption.gifticonSnapshot
        ? {
            title: redemption.gifticonSnapshot.title,
            amount: redemption.gifticonSnapshot.amount,
            imageUrl: redemption.gifticonSnapshot.imageUrl
              ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
              : null,
            summary: redemption.gifticonSnapshot.summary || null,
          }
        : redemption.gifticon
          ? this.mapGifticonDetailToResponse(redemption.gifticon)
          : null,
      pointsUsed: redemption.pointsUsed,
      status: redemption.status,
      cancelledAt: redemption.cancelledAt || null,
      cancellationReason: redemption.cancellationReason || null,
      createdAt: redemption.createdAt,
      updatedAt: redemption.updatedAt,
    });
  }

  @Post(':id/redeem')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async redeemGifticon(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req?: Request,
  ): Promise<ApiResponse<any>> {
    const ipAddress = req ? getClientIp(req) : undefined;

    const redemption = await this.redeemGifticonUseCase.execute({
      userId: user.userId,
      gifticonId: id,
      ipAddress,
    });

    return ApiResponseUtil.success(
      {
        id: redemption.id,
        redemptionCode: redemption.redemptionCode || null,
        gifticon: redemption.gifticonSnapshot
          ? {
              title: redemption.gifticonSnapshot.title,
              amount: redemption.gifticonSnapshot.amount,
              imageUrl: redemption.gifticonSnapshot.imageUrl
                ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                : null,
              summary: redemption.gifticonSnapshot.summary || null,
              typeColor: redemption.gifticonSnapshot.typeColor || null,
            }
          : null,
        pointsUsed: redemption.pointsUsed,
        status: redemption.status,
        createdAt: redemption.createdAt,
      },
      'Gifticon redeemed successfully',
    );
  }

  @Post('redemptions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelRedemption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const redemption = await this.cancelRedemptionUseCase.execute({
      redemptionId: id,
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      {
        id: redemption.id,
        status: redemption.status,
        cancelledAt: redemption.cancelledAt,
        updatedAt: redemption.updatedAt,
      },
      'Redemption cancelled successfully',
    );
  }

  @Get(':idOrSlug')
  @HttpCode(HttpStatus.OK)
  async getGifticon(@Param('idOrSlug') idOrSlug: string): Promise<ApiResponse<any>> {
    const gifticon = await this.getGifticonUseCase.execute({ idOrSlug });

    return ApiResponseUtil.success(this.mapGifticonDetailToResponse(gifticon));
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
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
import { GetPointHistoryUseCase } from '../../../application/handlers/get-point-history.use-case';
import { RequestPointExchangeUseCase } from '../../../application/handlers/user/request-point-exchange.use-case';
import { GetMyExchangesUseCase } from '../../../application/handlers/user/get-my-exchanges.use-case';
import { GetExchangeDetailUseCase } from '../../../application/handlers/user/get-exchange-detail.use-case';
import { CancelExchangeUseCase } from '../../../application/handlers/user/cancel-exchange.use-case';
import { GetPointHistoryQueryDto } from '../dto/get-point-history-query.dto';
import { RequestPointExchangeDto } from '../dto/request-point-exchange.dto';
import { GetMyExchangesQueryDto } from '../dto/get-my-exchanges-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { Request } from 'express';
import { getClientIp } from '../../../../../shared/utils/request.util';

@Controller('api/points')
@UseGuards(JwtAuthGuard)
export class PointController {
  constructor(
    private readonly getPointHistoryUseCase: GetPointHistoryUseCase,
    private readonly requestPointExchangeUseCase: RequestPointExchangeUseCase,
    private readonly getMyExchangesUseCase: GetMyExchangesUseCase,
    private readonly getExchangeDetailUseCase: GetExchangeDetailUseCase,
    private readonly cancelExchangeUseCase: CancelExchangeUseCase,
  ) {}

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getPointHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetPointHistoryQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.getPointHistoryUseCase.execute({
      userId: user.userId,
      type: query.type || 'all',
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        category: transaction.category,
        referenceType: transaction.referenceType || null,
        referenceId: transaction.referenceId || null,
        description: transaction.description || null,
        metadata: transaction.metadata || null,
        createdAt: transaction.createdAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post('exchange')
  @HttpCode(HttpStatus.CREATED)
  async requestPointExchange(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RequestPointExchangeDto,
    @Req() req?: Request,
  ): Promise<ApiResponse<any>> {
    const ipAddress = req ? getClientIp(req) : undefined;

    const exchange = await this.requestPointExchangeUseCase.execute({
      userId: user.userId,
      siteId: dto.siteId,
      pointsAmount: dto.pointsAmount,
      siteUserId: dto.siteUserId,
      ipAddress,
    });

    return ApiResponseUtil.success(
      {
        id: exchange.id,
        siteId: exchange.siteId,
        site: exchange.site
          ? {
              id: exchange.site.id,
              name: exchange.site.name,
            }
          : null,
        pointsAmount: exchange.pointsAmount,
        siteCurrencyAmount: Number(exchange.siteCurrencyAmount),
        exchangeRate: exchange.exchangeRate ? Number(exchange.exchangeRate) : null,
        siteUserId: exchange.siteUserId,
        status: exchange.status,
        createdAt: exchange.createdAt,
      },
      'Point exchange request created successfully',
    );
  }

  @Get('exchanges')
  @HttpCode(HttpStatus.OK)
  async getMyExchanges(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetMyExchangesQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.getMyExchangesUseCase.execute({
      userId: user.userId,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((exchange) => ({
        id: exchange.id,
        siteId: exchange.siteId,
        site: exchange.site
          ? {
              id: exchange.site.id,
              name: exchange.site.name,
            }
          : null,
        pointsAmount: exchange.pointsAmount,
        siteCurrencyAmount: Number(exchange.siteCurrencyAmount),
        exchangeRate: exchange.exchangeRate ? Number(exchange.exchangeRate) : null,
        siteUserId: exchange.siteUserId,
        status: exchange.status,
        rejectionReason: exchange.rejectionReason || null,
        createdAt: exchange.createdAt,
        updatedAt: exchange.updatedAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('exchanges/:id')
  @HttpCode(HttpStatus.OK)
  async getExchangeDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.getExchangeDetailUseCase.execute({
      userId: user.userId,
      exchangeId: id,
    });

    return ApiResponseUtil.success({
      id: exchange.id,
      siteId: exchange.siteId,
      site: exchange.site
        ? {
            id: exchange.site.id,
            name: exchange.site.name,
          }
        : null,
      pointsAmount: exchange.pointsAmount,
      siteCurrencyAmount: Number(exchange.siteCurrencyAmount),
      exchangeRate: exchange.exchangeRate ? Number(exchange.exchangeRate) : null,
      siteUserId: exchange.siteUserId,
      status: exchange.status,
      rejectionReason: exchange.rejectionReason || null,
      processedAt: exchange.processedAt || null,
      createdAt: exchange.createdAt,
      updatedAt: exchange.updatedAt,
    });
  }

  @Post('exchanges/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelExchange(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.cancelExchangeUseCase.execute({
      exchangeId: id,
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      {
        id: exchange.id,
        status: exchange.status,
        updatedAt: exchange.updatedAt,
      },
      'Exchange cancelled successfully',
    );
  }
}

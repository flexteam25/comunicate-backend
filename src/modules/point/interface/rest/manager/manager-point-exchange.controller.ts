import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { ListSiteExchangesUseCase } from '../../../application/handlers/manager/list-site-exchanges.use-case';
import { ManagerApproveExchangeUseCase } from '../../../application/handlers/manager/manager-approve-exchange.use-case';
import { ManagerRejectExchangeUseCase } from '../../../application/handlers/manager/manager-reject-exchange.use-case';
import { ManagerMoveExchangeToProcessingUseCase } from '../../../application/handlers/manager/manager-move-exchange-to-processing.use-case';
import { ListSiteExchangesQueryDto } from '../dto/list-site-exchanges-query.dto';
import { RejectExchangeDto } from '../dto/reject-exchange.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';

@Controller('api/site-management/:siteId/exchanges')
@UseGuards(JwtAuthGuard)
export class ManagerPointExchangeController {
  constructor(
    private readonly listSiteExchangesUseCase: ListSiteExchangesUseCase,
    private readonly managerApproveExchangeUseCase: ManagerApproveExchangeUseCase,
    private readonly managerRejectExchangeUseCase: ManagerRejectExchangeUseCase,
    private readonly managerMoveExchangeToProcessingUseCase: ManagerMoveExchangeToProcessingUseCase,
  ) {}

  private mapExchangeToResponse(exchange: any): any {
    return {
      id: exchange.id,
      userId: exchange.userId,
      user: exchange.user
        ? {
            id: exchange.user.id,
            email: exchange.user.email,
            displayName: exchange.user.displayName || null,
          }
        : null,
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
      adminId: exchange.adminId || null,
      admin: exchange.admin
        ? {
            id: exchange.admin.id,
            email: exchange.admin.email,
            displayName: exchange.admin.displayName || null,
          }
        : null,
      managerId: exchange.managerId || null,
      manager: exchange.manager
        ? {
            id: exchange.manager.id,
            email: exchange.manager.email,
            displayName: exchange.manager.displayName || null,
          }
        : null,
      processedAt: exchange.processedAt || null,
      rejectionReason: exchange.rejectionReason || null,
      createdAt: exchange.createdAt,
      updatedAt: exchange.updatedAt,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listExchanges(
    @Param('siteId') siteId: string,
    @Query() query: ListSiteExchangesQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const result = await this.listSiteExchangesUseCase.execute({
      siteIdOrSlug: siteId,
      managerUserId: user.userId,
      status: query.status,
      userName: query.userName,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((exchange) => this.mapExchangeToResponse(exchange)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveExchange(
    @Param('siteId') siteId: string,
    @Param('id') exchangeId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.managerApproveExchangeUseCase.execute({
      exchangeId,
      siteIdOrSlug: siteId,
      managerUserId: user.userId,
    });

    return ApiResponseUtil.success(
      this.mapExchangeToResponse(exchange),
      'Exchange approved successfully',
    );
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectExchange(
    @Param('siteId') siteId: string,
    @Param('id') exchangeId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RejectExchangeDto,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.managerRejectExchangeUseCase.execute({
      exchangeId,
      siteIdOrSlug: siteId,
      managerUserId: user.userId,
      reason: dto.reason,
    });

    return ApiResponseUtil.success(
      this.mapExchangeToResponse(exchange),
      'Exchange rejected successfully',
    );
  }

  @Post(':id/processing')
  @HttpCode(HttpStatus.OK)
  async moveToProcessing(
    @Param('siteId') siteId: string,
    @Param('id') exchangeId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.managerMoveExchangeToProcessingUseCase.execute({
      exchangeId,
      siteIdOrSlug: siteId,
      managerUserId: user.userId,
    });

    return ApiResponseUtil.success(
      this.mapExchangeToResponse(exchange),
      'Exchange moved to processing',
    );
  }
}

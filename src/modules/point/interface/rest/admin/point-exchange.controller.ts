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
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { ListExchangesUseCase } from '../../../application/handlers/admin/list-exchanges.use-case';
import { GetExchangeDetailUseCase as AdminGetExchangeDetailUseCase } from '../../../application/handlers/admin/get-exchange-detail.use-case';
import { MoveExchangeToProcessingUseCase } from '../../../application/handlers/admin/move-exchange-to-processing.use-case';
import { ApproveExchangeUseCase } from '../../../application/handlers/admin/approve-exchange.use-case';
import { RejectExchangeUseCase } from '../../../application/handlers/admin/reject-exchange.use-case';
import { ListExchangesQueryDto } from '../dto/list-exchanges-query.dto';
import { RejectExchangeDto } from '../dto/reject-exchange.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';

@Controller('admin/points/exchanges')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminPointExchangeController {
  constructor(
    private readonly listExchangesUseCase: ListExchangesUseCase,
    private readonly getExchangeDetailUseCase: AdminGetExchangeDetailUseCase,
    private readonly moveExchangeToProcessingUseCase: MoveExchangeToProcessingUseCase,
    private readonly approveExchangeUseCase: ApproveExchangeUseCase,
    private readonly rejectExchangeUseCase: RejectExchangeUseCase,
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
            slug: exchange.site.slug || null,
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
  @RequirePermission('points.exchange.manage')
  @HttpCode(HttpStatus.OK)
  async listExchanges(@Query() query: ListExchangesQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listExchangesUseCase.execute({
      status: query.status,
      siteId: query.siteId,
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

  @Get(':id')
  @RequirePermission('points.exchange.manage')
  @HttpCode(HttpStatus.OK)
  async getExchangeDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.getExchangeDetailUseCase.execute({
      exchangeId: id,
    });

    return ApiResponseUtil.success(this.mapExchangeToResponse(exchange));
  }

  @Post(':id/processing')
  @RequirePermission('points.exchange.manage')
  @HttpCode(HttpStatus.OK)
  async moveToProcessing(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.moveExchangeToProcessingUseCase.execute({
      exchangeId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      this.mapExchangeToResponse(exchange),
      'Exchange moved to processing',
    );
  }

  @Post(':id/approve')
  @RequirePermission('points.exchange.manage')
  @HttpCode(HttpStatus.OK)
  async approveExchange(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.approveExchangeUseCase.execute({
      exchangeId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      this.mapExchangeToResponse(exchange),
      'Exchange approved successfully',
    );
  }

  @Post(':id/reject')
  @RequirePermission('points.exchange.manage')
  @HttpCode(HttpStatus.OK)
  async rejectExchange(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: RejectExchangeDto,
  ): Promise<ApiResponse<any>> {
    const exchange = await this.rejectExchangeUseCase.execute({
      exchangeId: id,
      adminId: admin.adminId,
      reason: dto.reason,
    });

    return ApiResponseUtil.success(
      this.mapExchangeToResponse(exchange),
      'Exchange rejected successfully',
    );
  }
}

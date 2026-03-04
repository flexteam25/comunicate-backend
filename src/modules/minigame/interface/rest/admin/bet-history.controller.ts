import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ListAdminBetHistoriesUseCase } from '../../../application/handlers/admin/list-admin-bet-histories.use-case';
import { GetAdminBetHistoryDetailUseCase } from '../../../application/handlers/admin/get-admin-bet-history-detail.use-case';
import {
  AdminBetHistoryItemDto,
  AdminBetHistoryUserDto,
} from './dto/admin-bet-history-response.dto';

@Controller('admin/bet-histories')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminBetHistoryController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listAdminBetHistoriesUseCase: ListAdminBetHistoriesUseCase,
    private readonly configService: ConfigService,
    private readonly getAdminBetHistoryDetailUseCase: GetAdminBetHistoryDetailUseCase,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapUserAvatar(user: AdminBetHistoryUserDto): AdminBetHistoryUserDto {
    return {
      ...user,
      avatarUrl: user.avatarUrl
        ? buildFullUrl(this.apiServiceUrl, user.avatarUrl)
        : user.avatarUrl,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('bet-history.read')
  async list(
    @Query('gameType') gameType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userName') userName?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<
    ApiResponse<{
      data: AdminBetHistoryItemDto[];
      nextCursor: string | null;
      prevCursor: string | null;
    }>
  > {
    const result = await this.listAdminBetHistoriesUseCase.execute({
      gameType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userName,
      cursor,
      limit: limit != null ? parseInt(String(limit), 10) || 20 : 20,
    });

    const data = result.data.map((item) => ({
      ...item,
      user: this.mapUserAvatar(item.user),
    }));

    return ApiResponseUtil.success({
      data,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor ?? null,
    });
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('bet-history.read')
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<AdminBetHistoryItemDto | null>> {
    const item = await this.getAdminBetHistoryDetailUseCase.execute({ id });
    const mapped =
      item && item.user ? { ...item, user: this.mapUserAvatar(item.user) } : item;
    return ApiResponseUtil.success(mapped);
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('bet-history.read')
  async listByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('gameType') gameType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<
    ApiResponse<{
      data: AdminBetHistoryItemDto[];
      nextCursor: string | null;
      prevCursor: string | null;
    }>
  > {
    const result = await this.listAdminBetHistoriesUseCase.execute({
      userId,
      gameType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      cursor,
      limit: limit != null ? parseInt(String(limit), 10) || 20 : 20,
    });

    const data = result.data.map((item) => ({
      ...item,
      user: this.mapUserAvatar(item.user),
    }));

    return ApiResponseUtil.success({
      data,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor ?? null,
    });
  }
}

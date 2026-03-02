import { Controller, Get, HttpCode, HttpStatus, UseGuards, Query } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { GetPlayingUsersUseCase } from '../../../application/handlers/admin/get-playing-users.use-case';
import { PlayingUserItemDto } from './dto/playing-user-response.dto';
import { GetAdminLeaderboardUseCase } from '../../../application/handlers/admin/get-admin-leaderboard.use-case';
import {
  AdminLeaderboardResponseDto,
  AdminLeaderboardOrderBy,
  AdminLeaderboardSortBy,
} from './dto/admin-leaderboard-response.dto';

@Controller('admin/minigame')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminMinigamePlayingController {
  constructor(
    private readonly getPlayingUsersUseCase: GetPlayingUsersUseCase,
    private readonly getAdminLeaderboardUseCase: GetAdminLeaderboardUseCase,
  ) {}

  @Get('playing')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('bet-history.read')
  async getPlayingUsers(
    @Query('userName') userName?: string,
    @Query('gameType') gameType?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<
    ApiResponse<{
      data: PlayingUserItemDto[];
      nextCursor: string | null;
      prevCursor: string | null;
    }>
  > {
    const result = await this.getPlayingUsersUseCase.execute({
      userName,
      gameType,
      cursor,
      limit: limit != null ? parseInt(String(limit), 10) : undefined,
    });
    return ApiResponseUtil.success({
      data: result.data,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
    });
  }

  @Get('leaderboard')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('bet-history.read')
  async getAdminLeaderboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('gameType') gameType?: string,
    @Query('sortBy') sortBy?: AdminLeaderboardSortBy,
    @Query('orderBy') orderBy?: AdminLeaderboardOrderBy,
    @Query('limit') limit?: number,
  ): Promise<ApiResponse<AdminLeaderboardResponseDto>> {
    const result = await this.getAdminLeaderboardUseCase.execute({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      gameType,
      sortBy,
      orderBy,
      limit: limit != null ? parseInt(String(limit), 10) : undefined,
    });

    return ApiResponseUtil.success(result);
  }
}

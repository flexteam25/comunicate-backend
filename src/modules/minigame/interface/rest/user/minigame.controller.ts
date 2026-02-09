import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { LaunchGameDto } from '../dto/launch-game.dto';
import { GameCallbackDto } from '../dto/game-callback.dto';
import { LaunchGameUseCase } from '../../../application/handlers/launch-game.use-case';
import { HandleGameCallbackUseCase } from '../../../application/handlers/handle-game-callback.use-case';
import { GameCallbackGuard } from '../../../infrastructure/guards/game-callback.guard';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { formatPoints } from '../../../../../shared/utils/point.util';
import { GetGameBetLimitsService } from '../../../../system-settings/application/services/get-game-bet-limits.service';

@Controller('api/game')
export class MinigameController {
  constructor(
    private readonly launchGameUseCase: LaunchGameUseCase,
    private readonly handleGameCallbackUseCase: HandleGameCallbackUseCase,
    private readonly getGameBetLimitsService: GetGameBetLimitsService,
  ) {}

  @Get('bet-limits')
  @UseGuards(GameCallbackGuard)
  async getBetLimits(): Promise<{ limits: Record<string, { minBet: number; maxBet: number; maxPayoutAmount: number }>; status: boolean }> {
    const limits = await this.getGameBetLimitsService.get();
    return { limits, status: true };
  }

  @Post('launch')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async launch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: LaunchGameDto,
  ): Promise<ApiResponse<{ url: string }>> {
    const result = await this.launchGameUseCase.execute({
      userId: user.userId,
      gameType: dto.gameType,
    });
    return ApiResponseUtil.success(result, MessageKeys.MINIGAME_LAUNCH_SUCCESS as string);
  }

  @Post('callback')
  @UseGuards(GameCallbackGuard)
  @HttpCode(HttpStatus.OK)
  async callback(
    @Body() dto: GameCallbackDto,
  ): Promise<{ status: string; message?: string; newBalance?: number }> {
    const result = await this.handleGameCallbackUseCase.execute({
      type: dto.type,
      res: dto.res,
      amount: dto.amount,
      userUuid: dto.userUuid,
      txRef: dto.txRef,
      roundId: dto.roundId,
      gameType: dto.gameType,
    });
    if (result.status === 'OK' && 'newBalance' in result && result.newBalance != null) {
      return { ...result, newBalance: formatPoints(result.newBalance) };
    }
    return result;
  }
}

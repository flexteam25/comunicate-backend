import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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

@Controller('api/game')
export class MinigameController {
  constructor(
    private readonly launchGameUseCase: LaunchGameUseCase,
    private readonly handleGameCallbackUseCase: HandleGameCallbackUseCase,
  ) {}

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
  async callback(@Body() dto: GameCallbackDto): Promise<{ status: string; message?: string; newBalance?: number }> {
    const result = await this.handleGameCallbackUseCase.execute({
      type: dto.type,
      res: dto.res,
      amount: dto.amount,
      userUuid: dto.userUuid,
      txRef: dto.txRef,
      roundId: dto.roundId,
      gameType: dto.gameType,
    });
    return result;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { GameBackendClientService } from '../../../../shared/services/game-backend-client.service';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../user/domain/entities/user.entity';
import {
  notFound,
  badRequest,
  serviceUnavailable,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { MinigamePlayingStateService } from '../services/minigame-playing-state.service';
import { MaintenanceCheckService } from '../../../system-settings/application/services/maintenance-check.service';

export interface LaunchGameCommand {
  userId: string;
  gameType: string;
}

@Injectable()
export class LaunchGameUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly gameBackendClient: GameBackendClientService,
    private readonly logger: LoggerService,
    private readonly minigamePlayingStateService: MinigamePlayingStateService,
    private readonly maintenanceCheckService: MaintenanceCheckService,
  ) {}

  async execute(command: LaunchGameCommand): Promise<{ url: string }> {
    const maintenance = await this.maintenanceCheckService.getMaintenance();
    if (maintenance.status === 1) {
      throw serviceUnavailable(MessageKeys.MAINTENANCE_MODE);
    }

    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw notFound(MessageKeys.PARTNER_USER_NOT_FOUND);
    }
    if (!this.gameBackendClient.isConfigured()) {
      throw badRequest(MessageKeys.MINIGAME_NOT_CONFIGURED);
    }
    try {
      const payload = this.buildPayload(user);
      const result = await this.gameBackendClient.launchGame(payload);
      await this.minigamePlayingStateService.setPlaying(
        command.userId,
        command.gameType,
      );
      return result;
    } catch (err) {
      this.logger.error('Failed to launch game', { error: err instanceof Error ? err.message : String(err) }, 'minigame');
      throw badRequest(MessageKeys.MINIGAME_LAUNCH_FAILED);
    }
  }

  private buildPayload(user: User): {
    userUuid: string;
    userName: string;
    userNickName: string;
    balance: number;
    userAvatar?: string;
    userEmail?: string;
  } {
    const displayName = user.displayName || user.email || '';
    const nickName = displayName || user.email || user.id;
    const balance = user.userProfile?.points ?? 0;
    return {
      userUuid: user.id,
      userName: user.email,
      userNickName: nickName,
      balance,
      userAvatar: user.avatarUrl ?? undefined,
      userEmail: user.email ?? undefined,
    };
  }
}

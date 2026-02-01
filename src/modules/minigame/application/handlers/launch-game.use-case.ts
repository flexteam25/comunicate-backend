import { Inject, Injectable } from '@nestjs/common';
import { GameBackendClientService } from '../../../../shared/services/game-backend-client.service';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../user/domain/entities/user.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

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
  ) {}

  async execute(command: LaunchGameCommand): Promise<{ url: string }> {
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw notFound(MessageKeys.PARTNER_USER_NOT_FOUND);
    }
    if (!this.gameBackendClient.isConfigured()) {
      throw badRequest(MessageKeys.MINIGAME_NOT_CONFIGURED);
    }
    try {
      const payload = this.buildPayload(user);
      return await this.gameBackendClient.launchGame(payload);
    } catch (err) {
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

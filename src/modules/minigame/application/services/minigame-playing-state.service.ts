import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';

export const MINIGAME_PLAYING_TTL_SECONDS = 120; // 2 minutes

@Injectable()
export class MinigamePlayingStateService {
  constructor(
    private readonly redisService: RedisService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /** Set or refresh user as playing a game. TTL 2 min. */
  async setPlaying(userId: string, gameType: string): Promise<void> {
    const existing = await this.redisService.getMinigamePlaying(userId);
    await this.redisService.setMinigamePlaying(
      userId,
      gameType,
      MINIGAME_PLAYING_TTL_SECONDS,
    );
    if (!existing) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return;
      }
      await this.redisService.publishEvent(RedisChannel.MINIGAME_PLAYING_CREATED, {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName ?? null,
          avatarUrl: user.avatarUrl ?? null,
        },
        gameType,
      });
    }
  }

  /** Get list of userId + gameType from cache (all currently playing). */
  getPlayingList(): Promise<{ userId: string; gameType: string }[]> {
    return this.redisService.getMinigamePlayingList();
  }
}

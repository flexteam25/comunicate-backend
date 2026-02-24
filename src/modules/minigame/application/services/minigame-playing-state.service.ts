import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service';

export const MINIGAME_PLAYING_TTL_SECONDS = 120; // 2 minutes

@Injectable()
export class MinigamePlayingStateService {
  constructor(private readonly redisService: RedisService) {}

  /** Set or refresh user as playing a game. TTL 2 min. */
  setPlaying(userId: string, gameType: string): Promise<void> {
    return this.redisService.setMinigamePlaying(
      userId,
      gameType,
      MINIGAME_PLAYING_TTL_SECONDS,
    );
  }

  /** Get list of userId + gameType from cache (all currently playing). */
  getPlayingList(): Promise<{ userId: string; gameType: string }[]> {
    return this.redisService.getMinigamePlayingList();
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../../user/domain/entities/user.entity';
import { MinigamePlayingStateService } from '../../services/minigame-playing-state.service';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

export interface PlayingUserItem {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl?: string | null;
  };
  gameType: string;
}

export interface GetPlayingUsersCommand {
  userName?: string;
  gameType?: string;
  cursor?: string;
  limit?: number;
}

export interface GetPlayingUsersResult {
  data: PlayingUserItem[];
  nextCursor: string | null;
  prevCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function isPlayingUserItem(x: PlayingUserItem | null): x is PlayingUserItem {
  return x != null;
}

@Injectable()
export class GetPlayingUsersUseCase {
  constructor(
    private readonly minigamePlayingStateService: MinigamePlayingStateService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: GetPlayingUsersCommand = {}): Promise<GetPlayingUsersResult> {
    const { userName, gameType, cursor, limit = DEFAULT_LIMIT } = command;
    const realLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

    const playingList = await this.minigamePlayingStateService.getPlayingList();
    if (playingList.length === 0) {
      return { data: [], nextCursor: null, prevCursor: null };
    }

    // Filter by gameType at Redis level
    let filteredPlaying = playingList;
    if (gameType && gameType.trim() !== '') {
      const gameTypeTerm = gameType.trim().toLowerCase();
      filteredPlaying = playingList.filter((p) =>
        p.gameType.toLowerCase().includes(gameTypeTerm),
      );
      if (filteredPlaying.length === 0) {
        return { data: [], nextCursor: null, prevCursor: null };
      }
    }

    const userIds = filteredPlaying.map((x) => x.userId);
    const users = await this.userRepository.findByIds(userIds, ['userProfile']);
    const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

    let items: PlayingUserItem[] = filteredPlaying
      .map(({ userId, gameType: gt }) => {
        const user = userMap.get(userId);
        if (!user) return null;
        return {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName ?? null,
            avatarUrl: user.avatarUrl ?? null,
          },
          gameType: gt,
        };
      })
      .filter(isPlayingUserItem);

    // Filter by userName (email or displayName) at user layer
    if (userName != null && userName.trim() !== '') {
      const term = userName.trim().toLowerCase();
      items = items.filter((item) => {
        const email = (item.user.email ?? '').toLowerCase();
        const displayName = (item.user.displayName ?? '').toLowerCase();
        return email.includes(term) || displayName.includes(term);
      });
    }

    items.sort((a, b) => {
      const emailA = a.user.email.toLowerCase();
      const emailB = b.user.email.toLowerCase();
      if (emailA !== emailB) return emailA < emailB ? -1 : 1;
      return a.user.id < b.user.id ? -1 : 1;
    });

    const filterKey = JSON.stringify({
      userName: userName?.trim() ?? null,
      gameType: gameType?.trim() ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const page = items.slice(offset, offset + realLimit + 1);
    const hasMore = page.length > realLimit;
    const data = page.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return {
      data,
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }
}

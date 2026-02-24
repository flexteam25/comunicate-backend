import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../../user/domain/entities/user.entity';
import { MinigamePlayingStateService } from '../../services/minigame-playing-state.service';
import { CursorPaginationUtil } from '../../../../../shared/utils/cursor-pagination.util';

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

const SORT_EMAIL = 'email';
const SORT_ORDER = 'ASC' as const;
const SORT_DEFINITION = `${SORT_EMAIL}:${SORT_ORDER},id:${SORT_ORDER}`;
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
    let startIndex = 0;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const decoded = CursorPaginationUtil.decodeCursor(cursor);
        if (decoded.filterKey !== filterKey) {
          // Cursor from different search, ignore
        } else {
          const cursorEmail = (decoded.sortValue ?? '').toLowerCase();
          const cursorId = decoded.id;
          direction = decoded.direction ?? 'forward';
          if (direction === 'forward') {
            startIndex = items.findIndex(
              (item) =>
                item.user.email.toLowerCase() > cursorEmail ||
                (item.user.email.toLowerCase() === cursorEmail && item.user.id > cursorId),
            );
            if (startIndex < 0) startIndex = items.length;
          } else {
            // Backward: cursor is first item of current page; we want the page before it
            const cursorIndex = items.findIndex(
              (item) =>
                item.user.email.toLowerCase() > cursorEmail ||
                (item.user.email.toLowerCase() === cursorEmail && item.user.id >= cursorId),
            );
            const endBefore = cursorIndex < 0 ? items.length : cursorIndex;
            startIndex = Math.max(0, endBefore - realLimit);
          }
        }
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    let data: PlayingUserItem[];
    let hasMore: boolean;

    if (direction === 'forward') {
      const page = items.slice(startIndex, startIndex + realLimit + 1);
      hasMore = page.length > realLimit;
      data = page.slice(0, realLimit);
    } else {
      data = items.slice(startIndex, startIndex + realLimit);
      hasMore = startIndex > 0;
    }

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (direction === 'forward') {
      if (hasMore && data.length > 0) {
        const last = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(last.user.id, last.user.email, {
          direction: 'forward',
          sort: SORT_DEFINITION,
          filterKey,
        });
      }
      if (cursor && data.length > 0) {
        const first = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(first.user.id, first.user.email, {
          direction: 'backward',
          sort: SORT_DEFINITION,
          filterKey,
        });
      }
    } else {
      if (data.length > 0) {
        const last = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(last.user.id, last.user.email, {
          direction: 'forward',
          sort: SORT_DEFINITION,
          filterKey,
        });
      }
      if (hasMore && data.length > 0) {
        const first = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(first.user.id, first.user.email, {
          direction: 'backward',
          sort: SORT_DEFINITION,
          filterKey,
        });
      }
    }

    return {
      data,
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }
}

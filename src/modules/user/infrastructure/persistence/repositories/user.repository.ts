import { User } from '../../../domain/entities/user.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface UserFilters {
  email?: string;
  displayName?: string;
  isActive?: boolean;
}

export interface IUserRepository {
  findByEmail(email: string, relations?: string[]): Promise<User | null>;
  findById(id: string, relations?: string[]): Promise<User | null>;
  findByIdWithBadges(id: string): Promise<User | null>;
  findAllWithCursor(
    filters?: UserFilters,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<User>>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  save(user: User): Promise<User>;
}

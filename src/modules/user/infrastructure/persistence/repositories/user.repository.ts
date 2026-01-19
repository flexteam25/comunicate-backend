import { User } from '../../../domain/entities/user.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface UserFilters {
  search?: string; // Search in email or displayName
  email?: string;
  displayName?: string;
  searchIp?: string; // Search in user_profile IP columns (registerIp, lastLoginIp, lastRequestIp)
  status?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
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

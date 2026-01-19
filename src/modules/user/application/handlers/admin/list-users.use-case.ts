import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import {
  IUserRepository,
  UserFilters,
} from '../../../infrastructure/persistence/repositories/user.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListUsersCommand {
  search?: string;
  email?: string;
  displayName?: string;
  searchIp?: string;
  status?: string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: ListUsersCommand): Promise<CursorPaginationResult<User>> {
    const filters: UserFilters = {
      // If search is provided, ignore email and displayName
      search: command.search,
      email: command.search ? undefined : command.email,
      displayName: command.search ? undefined : command.displayName,
      searchIp: command.searchIp,
      status: command.status,
      isActive: command.isActive,
      sortBy: command.sortBy,
      sortDir: command.sortDir,
    };

    return this.userRepository.findAllWithCursor(
      filters,
      command.cursor,
      command.limit || 20,
    );
  }
}

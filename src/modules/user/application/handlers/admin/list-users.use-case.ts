import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository, UserFilters } from '../../../infrastructure/persistence/repositories/user.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListUsersCommand {
  email?: string;
  displayName?: string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: ListUsersCommand): Promise<CursorPaginationResult<User>> {
    const filters: UserFilters = {
      email: command.email,
      displayName: command.displayName,
      isActive: command.isActive,
    };

    return this.userRepository.findAllWithCursor(
      filters,
      command.cursor,
      command.limit || 20,
    );
  }
}


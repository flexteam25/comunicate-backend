import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetUserDetailCommand {
  userId: string;
}

@Injectable()
export class GetUserDetailUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: GetUserDetailCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId, [
      'userProfile',
      'userRoles',
      'userRoles.role',
      'userBadges',
      'userBadges.badge',
    ]);

    if (!user) {
      throw notFound(MessageKeys.USER_NOT_FOUND);
    }

    return user;
  }
}

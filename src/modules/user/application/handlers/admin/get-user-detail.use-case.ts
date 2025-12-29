import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';

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
      throw new NotFoundException('User not found');
    }

    return user;
  }
}


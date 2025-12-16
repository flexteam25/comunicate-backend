import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';

export interface RemoveBadgeCommand {
  userId: string;
  badgeId: string;
}

@Injectable()
export class RemoveBadgeUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
  ) {}

  async execute(command: RemoveBadgeCommand): Promise<void> {
    // Check if user exists
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if badge is assigned
    const hasBadge = await this.userBadgeRepository.hasBadge(
      command.userId,
      command.badgeId,
    );
    if (!hasBadge) {
      throw new BadRequestException('Badge is not assigned to this user');
    }

    // Remove badge
    await this.userBadgeRepository.removeBadge(command.userId, command.badgeId);
  }
}

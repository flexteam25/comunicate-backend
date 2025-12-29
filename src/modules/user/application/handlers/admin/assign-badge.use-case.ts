import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import { Badge, BadgeType } from '../../../../badge/domain/entities/badge.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserBadge } from '../../../domain/entities/user-badge.entity';

export interface AssignBadgeCommand {
  userId: string;
  badgeId: string;
}

@Injectable()
export class AssignBadgeUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
  ) {}

  async execute(command: AssignBadgeCommand): Promise<UserBadge> {
    // Check if user exists
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if badge exists, is active, and is of type 'user'
    const badge = await this.badgeRepository.findOne({
      where: {
        id: command.badgeId,
        deletedAt: null,
        isActive: true,
        badgeType: BadgeType.USER,
      },
    });
    if (!badge) {
      throw new BadRequestException('Badge not found or not available');
    }
    if (badge.badgeType !== BadgeType.USER) {
      throw new BadRequestException('Badge must be of type "user"');
    }

    // Check if already assigned
    const hasBadge = await this.userBadgeRepository.hasBadge(
      command.userId,
      command.badgeId,
    );
    if (hasBadge) {
      throw new BadRequestException('Badge already assigned to this user');
    }

    // Assign badge with active = true (default when admin assigns)
    return this.userBadgeRepository.assignBadge(command.userId, command.badgeId, true);
  }
}

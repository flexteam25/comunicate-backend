import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../infrastructure/persistence/repositories/user-badge.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { User } from '../../domain/entities/user.entity';

export interface UpdateProfileCommand {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  birthDate?: Date;
  gender?: string;
  activeBadges?: string[];
  inactiveBadges?: string[];
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<User> {
    // Find user (outside transaction for validation)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate badge lists if provided
    if (command.activeBadges && command.inactiveBadges) {
      // Check if there are any duplicate UUIDs between the two lists
      const activeSet = new Set(command.activeBadges);
      const inactiveSet = new Set(command.inactiveBadges);
      const duplicates = command.activeBadges.filter((id) => inactiveSet.has(id));
      if (duplicates.length > 0) {
        throw new BadRequestException(
          'activeBadges and inactiveBadges cannot contain the same UUIDs',
        );
      }
    }

    // Validate that all badge IDs belong to the user (if badge lists provided)
    if (command.activeBadges?.length || command.inactiveBadges?.length) {
      const allBadgeIds = [
        ...(command.activeBadges || []),
        ...(command.inactiveBadges || []),
      ];
      const userBadges = await this.userBadgeRepository.findByUserIdsWithActive(
        command.userId,
        allBadgeIds,
      );
      const userBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));
      const invalidBadgeIds = allBadgeIds.filter((id) => !userBadgeIds.has(id));
      if (invalidBadgeIds.length > 0) {
        throw new BadRequestException(
          `Invalid badge IDs: ${invalidBadgeIds.join(', ')}. These badges are not assigned to the user.`,
        );
      }
    }

    // Execute update in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Update fields
        if (command.displayName !== undefined) {
          user.displayName = command.displayName || null;
        }

        if (command.avatarUrl !== undefined) {
          user.avatarUrl = command.avatarUrl || null;
        }

        if (command.bio !== undefined) {
          user.userProfile.bio = command.bio || null;
        }

        if (command.phone !== undefined) {
          user.userProfile.phone = command.phone || null;
        }

        if (command.birthDate !== undefined) {
          user.userProfile.birthDate = command.birthDate || null;
        }

        if (command.gender !== undefined) {
          user.userProfile.gender = command.gender || null;
        }

        // Update user
        const savedUser = await entityManager.save(User, user);

        // Update badge active status
        if (command.activeBadges?.length) {
          await this.userBadgeRepository.updateActiveStatus(
            command.userId,
            command.activeBadges,
            true,
          );
        }

        if (command.inactiveBadges?.length) {
          await this.userBadgeRepository.updateActiveStatus(
            command.userId,
            command.inactiveBadges,
            false,
          );
        }

        return savedUser;
      },
    );
  }
}

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
import { UserProfile } from '../../domain/entities/user-profile.entity';

export interface UpdateProfileCommand {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  birthDate?: Date;
  gender?: string;
  activeBadge?: string;
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

    // Validate that the active badge belongs to the user (if provided)
    if (command.activeBadge) {
      const userBadge = await this.userBadgeRepository.findByUserAndBadge(
        command.userId,
        command.activeBadge,
      );
      if (!userBadge) {
        throw new BadRequestException(
          `Invalid badge ID: ${command.activeBadge}. This badge is not assigned to the user.`,
        );
      }
    }

    // Execute update in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Create user profile if it doesn't exist and we need to update profile fields
        const needsProfileUpdate =
          command.bio !== undefined ||
          command.phone !== undefined ||
          command.birthDate !== undefined ||
          command.gender !== undefined;

        if (needsProfileUpdate && !user.userProfile) {
          const userProfile = new UserProfile();
          userProfile.userId = user.id;
          userProfile.points = 0;
          await entityManager.save(UserProfile, userProfile);
          user.userProfile = userProfile;
        }

        // Update fields
        if (command.displayName !== undefined) {
          user.displayName = command.displayName || null;
        }

        if (command.avatarUrl !== undefined) {
          user.avatarUrl = command.avatarUrl || null;
        }

        if (command.bio !== undefined) {
          if (!user.userProfile) {
            throw new Error('User profile should exist at this point');
          }
          user.userProfile.bio = command.bio || null;
        }

        if (command.phone !== undefined) {
          if (!user.userProfile) {
            throw new Error('User profile should exist at this point');
          }
          user.userProfile.phone = command.phone || null;
        }

        if (command.birthDate !== undefined) {
          if (!user.userProfile) {
            throw new Error('User profile should exist at this point');
          }
          user.userProfile.birthDate = command.birthDate || null;
        }

        if (command.gender !== undefined) {
          if (!user.userProfile) {
            throw new Error('User profile should exist at this point');
          }
          user.userProfile.gender = command.gender || null;
        }

        // Update user
        const savedUser = await entityManager.save(User, user);

        // Save user profile if it was updated
        if (needsProfileUpdate && user.userProfile) {
          await entityManager.save(UserProfile, user.userProfile);
        }

        // Update active badge: set all badges to inactive, then set the specified badge to active
        if (command.activeBadge) {
          await this.userBadgeRepository.setActiveBadge(
            command.userId,
            command.activeBadge,
          );
        }

        return savedUser;
      },
    );
  }
}

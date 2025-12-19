import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
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
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<User> {
    // Find user (outside transaction for validation)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw new UnauthorizedException('User not found');
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
        return entityManager.save(User, user);
      },
    );
  }
}

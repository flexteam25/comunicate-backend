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
import { IOtpRequestRepository } from '../../../auth/infrastructure/persistence/repositories/otp-request.repository';
import { normalizePhone } from '../../../../shared/utils/phone.util';
import { OtpRequest } from '../../../auth/domain/entities/otp-request.entity';

export interface UpdateProfileCommand {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  otp?: string;
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
    @Inject('IOtpRequestRepository')
    private readonly otpRequestRepository: IOtpRequestRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<User> {
    // Find user (outside transaction for validation)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Normalize phone number if provided
    let normalizedPhone: string | null = null;
    if (command.phone !== undefined) {
      normalizedPhone = normalizePhone(command.phone);
      if (command.phone && !normalizedPhone) {
        throw new BadRequestException('Invalid phone number format');
      }
    }

    // Check if phone is being changed
    const currentPhone = user.userProfile?.phone || null;
    const phoneChanged = normalizedPhone !== null && normalizedPhone !== currentPhone;

    // If phone is being changed, require OTP and verify outside transaction
    let verifiedOtpRequest: any = null;
    if (phoneChanged) {
      if (!command.otp) {
        throw new BadRequestException('OTP is required when updating phone number');
      }

      // Verify OTP outside transaction (read-only check)
      const otpRequest = await this.otpRequestRepository.findByPhone(normalizedPhone);

      if (!otpRequest) {
        throw new BadRequestException('OTP not found. Please request OTP first');
      }

      if (otpRequest.isExpired()) {
        throw new BadRequestException('OTP has expired. Please request a new OTP');
      }

      if (otpRequest.otp !== command.otp) {
        throw new BadRequestException('Invalid OTP code');
      }

      // Check if phone is already verified by another user
      if (otpRequest.isVerified() && otpRequest.userId !== command.userId) {
        throw new BadRequestException(
          'This phone number has already been used by another user',
        );
      }

      verifiedOtpRequest = otpRequest;
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

          // If phone is being changed, handle OTP verification and update records
          if (phoneChanged && normalizedPhone && verifiedOtpRequest) {
            // Use entityManager repository to ensure same transaction context
            const otpRequestRepo = entityManager.getRepository(OtpRequest);

            // Mark old phone OTP record as deleted (soft delete)
            if (currentPhone) {
              const oldOtpRecord = await otpRequestRepo.findOne({
                where: { phone: currentPhone, userId: command.userId },
              });
              if (oldOtpRecord && !oldOtpRecord.deletedAt) {
                oldOtpRecord.deletedAt = new Date();
                await otpRequestRepo.save(oldOtpRecord);
              }
            }

            // Update new phone OTP record with user_id and verified_at
            // Reload within transaction to ensure we have the latest version
            const newOtpRequest = await otpRequestRepo.findOne({
              where: { id: (verifiedOtpRequest as OtpRequest).id },
            });
            if (newOtpRequest) {
              newOtpRequest.userId = command.userId;
              newOtpRequest.verifiedAt = new Date();
              await otpRequestRepo.save(newOtpRequest);
            }

            // Update user profile phone
            user.userProfile.phone = normalizedPhone;
          } else {
            // Phone not changed or is null
            user.userProfile.phone = normalizedPhone;
          }
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

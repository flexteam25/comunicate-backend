import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { IOtpRequestRepository } from '../../infrastructure/persistence/repositories/otp-request.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { User } from '../../../user/domain/entities/user.entity';
import { UserProfile } from 'src/modules/user/domain/entities/user-profile.entity';
import {
  PartnerRequest,
  PartnerRequestStatus,
} from '../../../partner/domain/entities/partner-request.entity';
import { OtpRequest } from '../../domain/entities/otp-request.entity';
import {
  conflict,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';
import { PointRewardService } from '../../../point/application/services/point-reward.service';

export interface RegisterCommand {
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
  token: string;
  birthDate?: Date;
  gender?: string;
  partner?: boolean;
  ipAddress?: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IOtpRequestRepository')
    private readonly otpRequestRepository: IOtpRequestRepository,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService,
    private readonly pointRewardService: PointRewardService,
  ) {}

  async execute(command: RegisterCommand): Promise<User> {
    // Verify token outside transaction first (read-only check)
    const otpRequest = await this.otpRequestRepository.findByToken(command.token);

    if (!otpRequest) {
      throw badRequest(MessageKeys.TOKEN_EXPIRED_PLEASE_VERIFY_OTP);
    }

    if (otpRequest.isVerified()) {
      throw badRequest(MessageKeys.EMAIL_ALREADY_EXISTS);
    }

    // Check if token is expired
    if (otpRequest.tokenExpiresAt && otpRequest.tokenExpiresAt < new Date()) {
      throw badRequest(MessageKeys.TOKEN_EXPIRED_PLEASE_VERIFY_OTP);
    }

    const normalizedPhone = otpRequest.phone;

    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Check if user already exists
        const existingUser = await entityManager.findOne(User, {
          where: { email: command.email, deletedAt: null },
        });
        if (existingUser) {
          throw conflict(MessageKeys.EMAIL_ALREADY_EXISTS);
        }

        // Hash password
        const passwordHash = await this.passwordService.hashPassword(command.password);

        // Create user
        const user = new User();
        user.email = command.email;
        user.passwordHash = passwordHash;
        user.displayName = command.displayName || null;
        user.isActive = true;
        const profile = new UserProfile();
        profile.bio = command.bio || null;
        profile.phone = normalizedPhone; // Use normalized phone
        profile.birthDate = command.birthDate || null;
        profile.gender = command.gender || null;
        profile.points = 0;
        profile.registerIp = command.ipAddress || null;

        profile.user = user;
        user.userProfile = profile;

        const savedUser = await entityManager.save(User, user);

        // Mark OTP as verified and set user_id
        // Use entityManager repository to ensure same transaction context
        const otpRequestRepo = entityManager.getRepository(OtpRequest);

        // Reload OTP request within transaction to ensure we have the latest version
        const otpRequestInTransaction = await otpRequestRepo.findOne({
          where: { id: otpRequest.id },
        });

        if (!otpRequestInTransaction) {
          throw badRequest(MessageKeys.OTP_REQUEST_NOT_FOUND);
        }

        otpRequestInTransaction.verifiedAt = new Date();
        otpRequestInTransaction.userId = savedUser.id;
        otpRequestInTransaction.token = null; // Invalidate token (one-time use)
        otpRequestInTransaction.tokenExpiresAt = null;
        await otpRequestRepo.save(otpRequestInTransaction);

        // Create partner request if partner flag is true
        if (command.partner === true) {
          const partnerRequestRepo = entityManager.getRepository(PartnerRequest);
          const partnerRequest = partnerRequestRepo.create({
            userId: savedUser.id,
            status: PartnerRequestStatus.PENDING,
          });
          await partnerRequestRepo.save(partnerRequest);
        }

        // Reward points for registration
        await this.pointRewardService.rewardPoints(entityManager, {
          userId: savedUser.id,
          pointSettingKey: 'register',
          category: 'register',
          referenceType: 'user_registration',
          referenceId: savedUser.id,
          description: '회원가입 보상 (Sign up reward)',
          descriptionKo: '회원가입 보상',
        });

        return savedUser;
      },
    );
  }
}

import {
  Injectable,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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

export interface RegisterCommand {
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
  phone: string;
  otp: string;
  birthDate?: Date;
  gender?: string;
  partner?: boolean;
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
  ) {}

  async execute(command: RegisterCommand): Promise<User> {
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Normalize phone number
        const normalizedPhone = this.normalizePhone(command.phone);
        if (!normalizedPhone) {
          throw new BadRequestException('Invalid phone number format');
        }

        // Verify OTP
        const otpRequest = await this.otpRequestRepository.findByPhone(normalizedPhone);

        if (!otpRequest) {
          throw new BadRequestException('OTP not found. Please request OTP first');
        }

        if (otpRequest.isVerified()) {
          throw new BadRequestException(
            'This phone number has already been used for registration',
          );
        }

        if (otpRequest.isExpired()) {
          throw new BadRequestException('OTP has expired. Please request a new OTP');
        }

        if (otpRequest.otp !== command.otp) {
          throw new BadRequestException('Invalid OTP code');
        }

        // Check if user already exists
        const existingUser = await entityManager.findOne(User, {
          where: { email: command.email, deletedAt: null },
        });
        if (existingUser) {
          throw new ConflictException('User with this email already exists');
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

        profile.user = user;
        user.userProfile = profile;

        const savedUser = await entityManager.save(User, user);

        // Mark OTP as verified
        otpRequest.verifiedAt = new Date();
        await this.otpRequestRepository.update(otpRequest);

        // Create partner request if partner flag is true
        if (command.partner === true) {
          const partnerRequestRepo = entityManager.getRepository(PartnerRequest);
          const partnerRequest = partnerRequestRepo.create({
            userId: savedUser.id,
            status: PartnerRequestStatus.PENDING,
          });
          await partnerRequestRepo.save(partnerRequest);
        }

        return savedUser;
      },
    );
  }

  /**
   * Normalize phone number to E.164 format (+XX...)
   * Supports formats: +84..., 84..., 0...
   */
  private normalizePhone(phone: string): string | null {
    if (!phone) {
      return null;
    }

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +, keep it
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // If starts with 0, replace with country code (default: +84 for Vietnam)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
      return `+84${cleaned}`;
    }

    // If starts with country code without +, add +
    if (cleaned.startsWith('84')) {
      return `+${cleaned}`;
    }

    // If starts with country code (other), add +
    // Default: assume it's a valid country code
    return `+${cleaned}`;
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { JwtService, TokenPair } from '../../../../shared/services/jwt.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { UserToken } from '../../domain/entities/user-token.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { UserProfile } from '../../../user/domain/entities/user-profile.entity';
import { badRequest, MessageKeys } from '../../../../shared/exceptions/exception-helpers';
import { PointRewardService } from '../../../point/application/services/point-reward.service';
import {
  getTodayInKST,
  getDateInKST,
} from '../../../../shared/utils/attendance-date.util';
export interface LoginCommand {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  point?: boolean;
}

export interface LoginResult {
  user: User;
  tokens: TokenPair;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly transactionService: TransactionService,
    private readonly pointRewardService: PointRewardService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    // Find user (outside transaction for validation)
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw badRequest(MessageKeys.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw badRequest(MessageKeys.USER_ACCOUNT_INACTIVE);
    }

    // Verify password (outside transaction)
    const isValidPassword = await this.passwordService.verifyPassword(
      command.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw badRequest(MessageKeys.INVALID_CREDENTIALS);
    }

    // Generate token pair (outside transaction)
    const tokens = this.jwtService.generateTokenPair(user.id, user.email);

    // Hash refresh token for storage (outside transaction)
    const refreshTokenHash = await this.passwordService.hashRefreshToken(
      tokens.refreshToken,
    );

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Check if this is first login of the day (before transaction)
    const todayKST = getTodayInKST();
    const lastLoginDateKST = user.lastLoginAt ? getDateInKST(user.lastLoginAt) : null;
    const isFirstLoginToday =
      (!lastLoginDateKST || lastLoginDateKST.getTime() !== todayKST.getTime()) &&
      command.point === true;

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Create token record
        const userToken = new UserToken();
        userToken.userId = user.id;
        userToken.tokenId = tokens.tokenId;
        userToken.refreshTokenHash = refreshTokenHash;
        userToken.deviceInfo = command.deviceInfo || null;
        userToken.ipAddress = command.ipAddress || null;
        userToken.expiresAt = expiresAt;

        await entityManager.save(UserToken, userToken);

        // Update last login timestamp
        const now = new Date();
        user.lastLoginAt = now;
        await entityManager.save(User, user);

        // Update last login IP in user profile (if exists)
        if (command.ipAddress) {
          const userProfileRepo = entityManager.getRepository(UserProfile);
          const profile = await userProfileRepo.findOne({
            where: { userId: user.id },
          });
          if (profile) {
            profile.lastLoginIp = command.ipAddress;
            await userProfileRepo.save(profile);
          }
        }

        // Reward points for first login of the day
        if (isFirstLoginToday) {
          await this.pointRewardService.rewardPoints(entityManager, {
            userId: user.id,
            pointSettingKey: 'first_login_daily',
            category: 'first_login_daily',
            referenceType: 'user_login',
            referenceId: userToken.id,
            description: '당일 첫 로그인 보상 (First login of the day reward)',
            descriptionKo: '당일 첫 로그인 보상',
          });
        }

        return {
          user,
          tokens,
        };
      },
    );
  }
}

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { JwtService, TokenPair } from '../../../../shared/services/jwt.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { UserToken } from '../../domain/entities/user-token.entity';
import { User } from '../../../user/domain/entities/user.entity';
export interface LoginCommand {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
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
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    // Find user (outside transaction for validation)
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password (outside transaction)
    const isValidPassword = await this.passwordService.verifyPassword(
      command.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token pair (outside transaction)
    const tokens = this.jwtService.generateTokenPair(user.id, user.email);

    // Hash refresh token for storage (outside transaction)
    const refreshTokenHash = await this.passwordService.hashRefreshToken(tokens.refreshToken);

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(async (entityManager: EntityManager) => {
      // Create token record
      const userToken = new UserToken();
      userToken.userId = user.id;
      userToken.tokenId = tokens.tokenId;
      userToken.refreshTokenHash = refreshTokenHash;
      userToken.deviceInfo = command.deviceInfo || null;
      userToken.ipAddress = command.ipAddress || null;
      userToken.expiresAt = expiresAt;

      await entityManager.save(UserToken, userToken);

      // Update last login
      user.lastLoginAt = new Date();
      await entityManager.save(User, user);

      return {
        user,
        tokens,
      };
    });
  }
}

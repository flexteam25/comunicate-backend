import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { JwtService, TokenPair } from '../../../../shared/services/jwt.service';
import { UserToken } from '../../domain/entities/user-token.entity';
import { User } from '../../../user/domain/entities/user.entity';

export interface RefreshTokenCommand {
  refreshToken: string;
}

export interface RefreshTokenResult {
  user: User;
  tokens: TokenPair;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(forwardRef(() => 'IUserRepository'))
    private readonly userRepository: IUserRepository,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    // Verify refresh token
    let payload;
    try {
      payload = this.jwtService.verifyRefreshToken(command.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find token record
    const tokenRecord = await this.userTokenRepository.findByTokenId(payload.jti);
    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found');
    }

    // Check if token is valid
    if (!tokenRecord.isValid()) {
      throw new UnauthorizedException('Token expired or revoked');
    }

    // Verify refresh token hash
    const isValidToken = await this.passwordService.verifyRefreshToken(
      command.refreshToken,
      tokenRecord.refreshTokenHash,
    );
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find user
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old token
    await this.userTokenRepository.revokeToken(payload.jti);

    // Generate new token pair
    const tokens = this.jwtService.generateTokenPair(user.id, user.email);

    // Hash new refresh token
    const refreshTokenHash = await this.passwordService.hashRefreshToken(tokens.refreshToken);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create new token record
    const newTokenRecord = new UserToken();
    newTokenRecord.userId = user.id;
    newTokenRecord.tokenId = tokens.tokenId;
    newTokenRecord.refreshTokenHash = refreshTokenHash;
    newTokenRecord.deviceInfo = tokenRecord.deviceInfo;
    newTokenRecord.ipAddress = tokenRecord.ipAddress;
    newTokenRecord.expiresAt = expiresAt;

    await this.userTokenRepository.create(newTokenRecord);

    return {
      user,
      tokens,
    };
  }
}

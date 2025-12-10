import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  jti: string; // token id for revocation
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

@Injectable()
export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string; // e.g., "30m", "1h", "7d"
  private readonly refreshTokenExpiresIn: string;

  constructor(private configService: ConfigService) {
    this.accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') || 'access-secret';
    this.refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret';
    // Use string format: "30m" = 30 minutes, "7d" = 7 days
    this.accessTokenExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '30m';
    this.refreshTokenExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  /**
   * Generate token pair (access + refresh) with unique token ID
   */
  generateTokenPair(userId: string, email: string): TokenPair {
    const tokenId = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        sub: userId,
        email,
        jti: tokenId,
        type: 'access',
      } as JwtPayload,
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
      },
    );

    const refreshToken = jwt.sign(
      {
        sub: userId,
        email,
        jti: tokenId,
        type: 'refresh',
      } as JwtPayload,
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
      },
    );

    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JwtPayload;
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for extracting token ID)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

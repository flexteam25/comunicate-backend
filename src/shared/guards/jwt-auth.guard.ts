import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService, JwtPayload } from '../services/jwt.service';
import { IUserTokenRepository } from '../../modules/auth/infrastructure/persistence/repositories/user-token.repository';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    tokenId: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token signature and expiration
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check if token is revoked in database
    const tokenRecord = await this.userTokenRepository.findByTokenId(payload.jti);
    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found');
    }
    if (!tokenRecord.isValid()) {
      throw new UnauthorizedException('Token has been revoked or expired');
    }

    // Attach user info to request
    request.user = {
      userId: payload.sub,
      email: payload.email,
      tokenId: payload.jti,
    };

    return true;
  }
}

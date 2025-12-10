import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '../services/jwt.service';
import { IUserTokenRepository } from '../../modules/auth/infrastructure/persistence/repositories/user-token.repository';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // Verify token
      const payload = this.jwtService.verifyAccessToken(token);

      // Check if token is revoked
      const tokenRecord = await this.userTokenRepository.findByTokenId(payload.jti);
      if (!tokenRecord || !tokenRecord.isValid()) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Attach user info to request
      request.user = {
        userId: payload.sub,
        email: payload.email,
        tokenId: payload.jti,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

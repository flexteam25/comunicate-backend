import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';

export interface LogoutCommand {
  tokenId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    // Check if token exists
    const token = await this.userTokenRepository.findByTokenId(command.tokenId);
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    // Revoke the token
    await this.userTokenRepository.revokeToken(command.tokenId);
  }
}


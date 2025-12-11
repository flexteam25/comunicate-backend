import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import { IUserTokenRepository } from '../../../auth/infrastructure/persistence/repositories/user-token.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { User } from '../../domain/entities/user.entity';

export interface ChangePasswordCommand {
  userId: string;
  tokenId: string;
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
  logoutAll?: boolean;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<User> {
    // Validate password confirmation
    if (command.newPassword !== command.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    // Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValidPassword = await this.passwordService.verifyPassword(
      command.currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    user.passwordHash = await this.passwordService.hashPassword(command.newPassword);

    // Update user
    const updatedUser = await this.userRepository.update(user);

    // If logoutAll is true, revoke all other tokens except the current one
    if (command.logoutAll) {
      const allTokens = await this.userTokenRepository.findByUserId(command.userId);
      for (const token of allTokens) {
        // Skip the current token
        if (token.tokenId !== command.tokenId) {
          await this.userTokenRepository.revokeToken(token.tokenId);
        }
      }
    }

    return updatedUser;
  }
}

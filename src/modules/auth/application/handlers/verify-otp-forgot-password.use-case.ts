import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { RedisService } from '../../../../shared/redis/redis.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface VerifyOtpForgotPasswordCommand {
  email: string;
  verifyCode: string;
}

@Injectable()
export class VerifyOtpForgotPasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(command: VerifyOtpForgotPasswordCommand): Promise<{ token: string }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw notFound(MessageKeys.ACCOUNT_NOT_FOUND);
    }

    if (!user.isActive) {
      throw notFound(MessageKeys.ACCOUNT_NOT_FOUND);
    }

    // Verify OTP from Redis
    const redisKey = `otp:forgot-password:${user.id}`;
    const storedOtp = await this.redisService.getString(redisKey);

    if (!storedOtp) {
      throw badRequest(MessageKeys.OTP_EXPIRED_OR_INVALID);
    }

    if (storedOtp !== command.verifyCode) {
      throw badRequest(MessageKeys.INVALID_OTP_CODE);
    }

    // Generate token (64 characters, alphanumeric)
    const token = this.generateToken();

    // Set token expiration (3 minutes from now)
    const tokenKey = `token:forgot-password:${token}`;
    const tokenValue = JSON.stringify({ userId: user.id, email: user.email });
    await this.redisService.setString(tokenKey, tokenValue, 180); // 3 minutes = 180 seconds

    // Delete OTP from Redis after successful verification
    await this.redisService.delete(redisKey);

    return { token };
  }

  /**
   * Generate random alphanumeric token (64 characters)
   */
  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

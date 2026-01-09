import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { RedisService } from '../../../../shared/redis/redis.service';

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
      throw new NotFoundException('Account not found');
    }

    if (!user.isActive) {
      throw new NotFoundException('Account not found');
    }

    // Verify OTP from Redis
    const redisKey = `otp:forgot-password:${user.id}`;
    const storedOtp = await this.redisService.getString(redisKey);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP has expired or is invalid');
    }

    if (storedOtp !== command.verifyCode) {
      throw new UnauthorizedException('Invalid OTP code');
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

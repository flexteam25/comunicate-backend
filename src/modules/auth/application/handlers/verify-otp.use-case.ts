import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IOtpRequestRepository } from '../../infrastructure/persistence/repositories/otp-request.repository';
import { OtpRequest } from '../../domain/entities/otp-request.entity';
import { normalizePhone } from '../../../../shared/utils/phone.util';

export interface VerifyOtpCommand {
  phone: string;
  otp: string;
}

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    @Inject('IOtpRequestRepository')
    private readonly otpRequestRepository: IOtpRequestRepository,
  ) {}

  async execute(command: VerifyOtpCommand): Promise<{ token: string }> {
    // Normalize phone number
    const normalizedPhone = normalizePhone(command.phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Find active OTP request
    const otpRequest = await this.otpRequestRepository.findByPhone(normalizedPhone);

    if (!otpRequest) {
      throw new BadRequestException('OTP not found. Please request OTP first');
    }

    if (otpRequest.isVerified()) {
      throw new BadRequestException(
        'This phone number has already been used for registration',
      );
    }

    if (otpRequest.isExpired()) {
      throw new BadRequestException('OTP has expired. Please request a new OTP');
    }

    if (otpRequest.otp !== command.otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Generate token (64 characters, alphanumeric)
    const token = this.generateToken();

    // Set token expiration (2 minutes from now)
    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes

    // Update OTP request with token
    otpRequest.token = token;
    otpRequest.tokenExpiresAt = tokenExpiresAt;
    await this.otpRequestRepository.update(otpRequest);

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

import { Injectable, Inject } from '@nestjs/common';
import { IOtpRequestRepository } from '../../infrastructure/persistence/repositories/otp-request.repository';
import { OtpRequest } from '../../domain/entities/otp-request.entity';
import { normalizePhone } from '../../../../shared/utils/phone.util';
import { badRequest, MessageKeys } from '../../../../shared/exceptions/exception-helpers';

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
      throw badRequest(MessageKeys.INVALID_PHONE_NUMBER_FORMAT);
    }

    // Find active OTP request
    const otpRequest = await this.otpRequestRepository.findByPhone(normalizedPhone);

    if (!otpRequest) {
      throw badRequest(MessageKeys.OTP_NOT_FOUND);
    }

    if (otpRequest.isVerified()) {
      throw badRequest(MessageKeys.PHONE_ALREADY_EXISTS);
    }

    if (otpRequest.isExpired()) {
      throw badRequest(MessageKeys.OTP_HAS_EXPIRED);
    }

    if (otpRequest.otp !== command.otp) {
      throw badRequest(MessageKeys.INVALID_OTP_CODE);
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

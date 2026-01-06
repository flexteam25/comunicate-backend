import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOtpRequestRepository } from '../../infrastructure/persistence/repositories/otp-request.repository';
import { OtpRequest } from '../../domain/entities/otp-request.entity';
import { TwilioService } from '../../../../shared/services/twilio/twilio.service';
import { LoggerService } from '../../../../shared/logger/logger.service';

export interface RequestOtpPhoneCommand {
  phone: string;
  ipAddress?: string;
}

@Injectable()
export class RequestOtpPhoneUseCase {
  private readonly otpExpiryMinutes: number;
  private readonly throttleWindowMinutes: number;
  private readonly maxRequestsPerWindow: number;
  private readonly otpLength: number;
  private readonly isTestMode: boolean;

  constructor(
    @Inject('IOtpRequestRepository')
    private readonly otpRequestRepository: IOtpRequestRepository,
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.otpExpiryMinutes = parseInt(
      this.configService.get<string>('OTP_EXPIRY_MINUTES') || '1',
      10,
    );
    this.throttleWindowMinutes = parseInt(
      this.configService.get<string>('OTP_THROTTLE_WINDOW_MINUTES') || '15',
      10,
    );
    this.maxRequestsPerWindow = parseInt(
      this.configService.get<string>('OTP_MAX_REQUESTS_PER_WINDOW') || '3',
      10,
    );
    this.otpLength = parseInt(
      this.configService.get<string>('OTP_LENGTH') || '6',
      10,
    );
    this.isTestMode =
      this.configService.get<string>('TEST_OTP')?.toLowerCase() === 'true';
  }

  async execute(
    command: RequestOtpPhoneCommand,
  ): Promise<{ message: string; otp?: string }> {
    // Normalize phone number to E.164 format
    const normalizedPhone = this.normalizePhone(command.phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Check if phone already verified (cannot be used for registration)
    const existingOtpRequest = await this.otpRequestRepository.findByPhone(
      normalizedPhone,
    );

    if (existingOtpRequest?.isVerified()) {
      throw new BadRequestException(
        'This phone number has already been used for registration',
      );
    }

    // Check throttle: if requestCount >= maxRequestsPerWindow
    // and lastRequestAt is within throttleWindowMinutes, reject
    const now = new Date();
    const throttleWindowStart = new Date(
      now.getTime() - this.throttleWindowMinutes * 60 * 1000,
    );

    if (existingOtpRequest) {
      // If lastRequestAt is outside the window, reset count to 1
      if (existingOtpRequest.lastRequestAt < throttleWindowStart) {
        existingOtpRequest.requestCount = 1;
      } else {
        // Still within window, check if exceeded limit
        if (existingOtpRequest.requestCount >= this.maxRequestsPerWindow) {
          const minutesRemaining = Math.ceil(
            (existingOtpRequest.lastRequestAt.getTime() +
              this.throttleWindowMinutes * 60 * 1000 -
              now.getTime()) /
              60000,
          );
          throw new HttpException(
            `Too many OTP requests. Please try again in ${minutesRemaining} minute(s)`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        // Increment count
        existingOtpRequest.requestCount += 1;
      }
    }

    // Generate OTP
    const otp = this.generateOtp();

    // Calculate expiry time
    const expiresAt = new Date(now.getTime() + this.otpExpiryMinutes * 60 * 1000);

    // Create or update OtpRequest
    let otpRequest: OtpRequest;
    if (existingOtpRequest) {
      otpRequest = existingOtpRequest;
      otpRequest.otp = otp;
      otpRequest.lastRequestAt = now;
      otpRequest.expiresAt = expiresAt;
      otpRequest.ipAddress = command.ipAddress || existingOtpRequest.ipAddress;
      otpRequest.verifiedAt = null; // Reset verifiedAt if exists
      await this.otpRequestRepository.update(otpRequest);
    } else {
      otpRequest = new OtpRequest();
      otpRequest.phone = normalizedPhone;
      otpRequest.otp = otp;
      otpRequest.ipAddress = command.ipAddress || null;
      otpRequest.requestCount = 1;
      otpRequest.lastRequestAt = now;
      otpRequest.expiresAt = expiresAt;
      await this.otpRequestRepository.create(otpRequest);
    }

    // Send SMS via Twilio (skip in test mode)
    if (this.isTestMode) {
      this.logger.info(
        'Test mode: OTP not sent via SMS',
        { phone: normalizedPhone, otp },
        'request-otp-phone',
      );
      return {
        message: 'OTP has been generated (test mode)',
        otp: otp,
      };
    }

    const smsSent = await this.twilioService.sendOtp(normalizedPhone, otp);

    if (!smsSent) {
      this.logger.error(
        'Failed to send OTP SMS',
        { phone: normalizedPhone },
        'request-otp-phone',
      );
      // Still return success to not reveal if phone exists
    }

    return {
      message: 'OTP has been sent to your phone number',
    };
  }

  /**
   * Normalize phone number to E.164 format (+XX...)
   * Supports formats: +84..., 84..., 0...
   */
  private normalizePhone(phone: string): string | null {
    if (!phone) {
      return null;
    }

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +, keep it
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // If starts with 0, replace with country code (default: +84 for Vietnam)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
      return `+84${cleaned}`;
    }

    // If starts with country code without +, add +
    if (cleaned.startsWith('84')) {
      return `+${cleaned}`;
    }

    // If starts with country code (other), add +
    // Default: assume it's a valid country code
    return `+${cleaned}`;
  }

  /**
   * Generate OTP code
   */
  private generateOtp(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
}

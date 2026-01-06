import { OtpRequest } from '../../../domain/entities/otp-request.entity';

export interface IOtpRequestRepository {
  /**
   * Find active OTP request by phone (excludes deleted records)
   * Used to check if phone can request new OTP
   */
  findByPhone(phone: string): Promise<OtpRequest | null>;

  /**
   * Find OTP request by phone and userId (includes deleted records for history)
   */
  findByPhoneAndUserId(phone: string, userId: string): Promise<OtpRequest | null>;

  create(otpRequest: OtpRequest): Promise<OtpRequest>;
  update(otpRequest: OtpRequest): Promise<OtpRequest>;
  save(otpRequest: OtpRequest): Promise<OtpRequest>;
}

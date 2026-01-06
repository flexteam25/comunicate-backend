import { OtpRequest } from '../../../domain/entities/otp-request.entity';

export interface IOtpRequestRepository {
  findByPhone(phone: string): Promise<OtpRequest | null>;
  create(otpRequest: OtpRequest): Promise<OtpRequest>;
  update(otpRequest: OtpRequest): Promise<OtpRequest>;
  save(otpRequest: OtpRequest): Promise<OtpRequest>;
}

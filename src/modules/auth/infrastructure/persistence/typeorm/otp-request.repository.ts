import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpRequest } from '../../../domain/entities/otp-request.entity';
import { IOtpRequestRepository } from '../repositories/otp-request.repository';

@Injectable()
export class OtpRequestRepository implements IOtpRequestRepository {
  constructor(
    @InjectRepository(OtpRequest)
    private readonly repository: Repository<OtpRequest>,
  ) {}

  /**
   * Find active OTP request by phone (excludes deleted records)
   * If a record has deletedAt, it will not be found, allowing creation of a new record
   * This preserves deleted records as history
   */
  async findByPhone(phone: string): Promise<OtpRequest | null> {
    return this.repository
      .createQueryBuilder('otp')
      .where('otp.phone = :phone', { phone })
      .andWhere('otp.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Find OTP request by phone and userId (includes deleted records for history lookup)
   * Used when checking if a phone was previously used by a specific user
   */
  async findByPhoneAndUserId(phone: string, userId: string): Promise<OtpRequest | null> {
    return this.repository.findOne({
      where: { phone, userId },
    });
  }

  async create(otpRequest: OtpRequest): Promise<OtpRequest> {
    const entity = this.repository.create(otpRequest);
    return this.repository.save(entity);
  }

  async update(otpRequest: OtpRequest): Promise<OtpRequest> {
    return this.repository.save(otpRequest);
  }

  async save(otpRequest: OtpRequest): Promise<OtpRequest> {
    return this.repository.save(otpRequest);
  }
}

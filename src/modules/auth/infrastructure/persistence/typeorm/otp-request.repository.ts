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

  async findByPhone(phone: string): Promise<OtpRequest | null> {
    return this.repository.findOne({
      where: { phone },
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

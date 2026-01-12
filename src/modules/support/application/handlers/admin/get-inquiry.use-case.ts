import { Injectable, Inject } from '@nestjs/common';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import { Inquiry } from '../../../domain/entities/inquiry.entity';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class GetInquiryUseCase {
  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
  ) {}

  async execute(inquiryId: string): Promise<Inquiry> {
    const inquiry = await this.inquiryRepository.findById(inquiryId, ['user', 'admin']);
    if (!inquiry) {
      throw notFound(MessageKeys.INQUIRY_NOT_FOUND);
    }
    return inquiry;
  }
}

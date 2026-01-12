import { Injectable, Inject } from '@nestjs/common';
import { IPartnerRequestRepository } from '../../../infrastructure/persistence/repositories/partner-request.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetMyPartnerRequestCommand {
  userId: string;
}

@Injectable()
export class GetMyPartnerRequestUseCase {
  constructor(
    @Inject('IPartnerRequestRepository')
    private readonly partnerRequestRepository: IPartnerRequestRepository,
  ) {}

  async execute(command: GetMyPartnerRequestCommand) {
    const partnerRequest = await this.partnerRequestRepository.findByUserId(
      command.userId,
      ['user', 'admin'],
    );

    if (!partnerRequest) {
      throw notFound(MessageKeys.PARTNER_REQUEST_NOT_FOUND);
    }

    return partnerRequest;
  }
}

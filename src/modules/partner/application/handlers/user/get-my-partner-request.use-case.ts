import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IPartnerRequestRepository } from '../../../infrastructure/persistence/repositories/partner-request.repository';

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
      throw new NotFoundException('No partner request found');
    }

    return partnerRequest;
  }
}

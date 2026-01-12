import { Injectable, Inject } from '@nestjs/common';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetRedemptionDetailCommand {
  redemptionId: string;
}

@Injectable()
export class GetRedemptionDetailUseCase {
  constructor(
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
  ) {}

  async execute(command: GetRedemptionDetailCommand): Promise<GifticonRedemption> {
    const redemption = await this.redemptionRepository.findById(command.redemptionId, [
      'user',
      'gifticon',
    ]);

    if (!redemption) {
      throw notFound(MessageKeys.REDEMPTION_NOT_FOUND);
    }

    return redemption;
  }
}

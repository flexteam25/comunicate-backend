import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';

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
      throw new NotFoundException('Redemption not found');
    }

    return redemption;
  }
}

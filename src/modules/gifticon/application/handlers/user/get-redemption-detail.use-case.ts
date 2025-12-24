import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';

export interface GetRedemptionDetailCommand {
  userId: string;
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
      'gifticon',
      'user',
    ]);

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    if (redemption.userId !== command.userId) {
      throw new UnauthorizedException('Not authorized to view this redemption');
    }

    return redemption;
  }
}

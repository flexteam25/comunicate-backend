import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  GifticonRedemption,
  GifticonRedemptionStatus,
} from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';

export interface ApproveRedemptionCommand {
  redemptionId: string;
}

@Injectable()
export class ApproveRedemptionUseCase {
  constructor(
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
  ) {}

  async execute(command: ApproveRedemptionCommand): Promise<GifticonRedemption> {
    const redemption = await this.redemptionRepository.findById(command.redemptionId);

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    if (redemption.status !== GifticonRedemptionStatus.PENDING) {
      throw new BadRequestException('Only pending redemptions can be approved');
    }

    return this.redemptionRepository.update(command.redemptionId, {
      status: GifticonRedemptionStatus.COMPLETED,
    });
  }
}

import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';

export interface AdminGetGifticonCommand {
  gifticonId: string;
}

@Injectable()
export class AdminGetGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
  ) {}

  async execute(command: AdminGetGifticonCommand): Promise<Gifticon> {
    const gifticon = await this.gifticonRepository.findById(command.gifticonId);

    if (!gifticon) {
      throw new NotFoundException('Gifticon not found');
    }

    return gifticon;
  }
}

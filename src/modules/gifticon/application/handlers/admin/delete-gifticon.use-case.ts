import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';

export interface DeleteGifticonCommand {
  gifticonId: string;
}

@Injectable()
export class DeleteGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
  ) {}

  async execute(command: DeleteGifticonCommand): Promise<void> {
    const gifticon = await this.gifticonRepository.findById(command.gifticonId);

    if (!gifticon) {
      throw new NotFoundException('Gifticon not found');
    }

    await this.gifticonRepository.softDelete(command.gifticonId);
  }
}

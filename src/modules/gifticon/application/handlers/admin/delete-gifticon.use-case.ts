import { Injectable, Inject } from '@nestjs/common';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.GIFTICON_NOT_FOUND);
    }

    await this.gifticonRepository.softDelete(command.gifticonId);
  }
}

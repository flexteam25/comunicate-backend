import { Injectable, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.GIFTICON_NOT_FOUND);
    }

    return gifticon;
  }
}

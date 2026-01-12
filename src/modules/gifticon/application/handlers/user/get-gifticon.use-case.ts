import { Injectable, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetGifticonCommand {
  idOrSlug: string;
}

@Injectable()
export class GetGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
  ) {}

  async execute(command: GetGifticonCommand): Promise<Gifticon> {
    const gifticon = await this.gifticonRepository.findByIdOrSlugPublic(command.idOrSlug);

    if (!gifticon) {
      throw notFound(MessageKeys.GIFTICON_NOT_FOUND);
    }

    return gifticon;
  }
}

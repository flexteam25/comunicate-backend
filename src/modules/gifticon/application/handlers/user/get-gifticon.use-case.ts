import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';

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
      throw new NotFoundException('Gifticon not found');
    }

    return gifticon;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserFavoriteSiteRepository } from '../../infrastructure/persistence/repositories/user-favorite-site.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';

export interface RemoveFavoriteSiteCommand {
  userId: string;
  siteId: string;
}

@Injectable()
export class RemoveFavoriteSiteUseCase {
  constructor(
    @Inject('IUserFavoriteSiteRepository')
    private readonly favoriteRepository: IUserFavoriteSiteRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: RemoveFavoriteSiteCommand): Promise<void> {
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    await this.favoriteRepository.removeFavorite(command.userId, command.siteId);
  }
}

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';

export interface DeleteSiteCommand {
  siteId: string;
}

@Injectable()
export class DeleteSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: DeleteSiteCommand): Promise<void> {
    // Check if site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Soft delete
    await this.siteRepository.delete(command.siteId);
  }
}


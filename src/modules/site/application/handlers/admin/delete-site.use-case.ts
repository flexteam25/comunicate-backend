import { Injectable, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Soft delete
    await this.siteRepository.delete(command.siteId);
  }
}

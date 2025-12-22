import { Injectable, Inject } from '@nestjs/common';
import { SiteManager } from '../../../domain/entities/site-manager.entity';
import { ISiteManagerRepository } from '../../../infrastructure/persistence/repositories/site-manager.repository';

export interface GetManagedSitesCommand {
  userId: string;
}

@Injectable()
export class GetManagedSitesUseCase {
  constructor(
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
  ) {}

  async execute(command: GetManagedSitesCommand): Promise<SiteManager[]> {
    return this.siteManagerRepository.findByUserId(command.userId);
  }
}

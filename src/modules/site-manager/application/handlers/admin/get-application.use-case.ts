import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../../infrastructure/persistence/repositories/site-manager-application.repository';

export interface GetApplicationCommand {
  applicationId: string;
}

@Injectable()
export class GetApplicationUseCase {
  constructor(
    @Inject('ISiteManagerApplicationRepository')
    private readonly applicationRepository: ISiteManagerApplicationRepository,
  ) {}

  async execute(command: GetApplicationCommand): Promise<SiteManagerApplication> {
    const application = await this.applicationRepository.findById(
      command.applicationId,
      ['site', 'user', 'admin'],
    );

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }
}

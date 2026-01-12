import { Injectable, Inject } from '@nestjs/common';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../../infrastructure/persistence/repositories/site-manager-application.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
    const application = await this.applicationRepository.findById(command.applicationId, [
      'site',
      'user',
      'admin',
    ]);

    if (!application) {
      throw notFound(MessageKeys.APPLICATION_NOT_FOUND);
    }

    return application;
  }
}

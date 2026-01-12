import { Injectable, Inject } from '@nestjs/common';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../../infrastructure/persistence/repositories/site-manager-application.repository';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RejectApplicationCommand {
  applicationId: string;
  adminId: string;
}

@Injectable()
export class RejectApplicationUseCase {
  constructor(
    @Inject('ISiteManagerApplicationRepository')
    private readonly applicationRepository: ISiteManagerApplicationRepository,
  ) {}

  async execute(command: RejectApplicationCommand): Promise<SiteManagerApplication> {
    const application = await this.applicationRepository.findById(command.applicationId);

    if (!application) {
      throw notFound(MessageKeys.APPLICATION_NOT_FOUND);
    }

    if (application.status !== SiteManagerApplicationStatus.PENDING) {
      throw badRequest(MessageKeys.APPLICATION_ALREADY_PROCESSED);
    }

    // Update application
    const updated = await this.applicationRepository.update(command.applicationId, {
      status: SiteManagerApplicationStatus.REJECTED,
      adminId: command.adminId,
      reviewedAt: new Date(),
    });

    // Reload with relations
    const reloaded = await this.applicationRepository.findById(updated.id, [
      'site',
      'user',
      'admin',
    ]);

    if (!reloaded) {
      throw new Error('Failed to reload application after rejection');
    }

    return reloaded;
  }
}

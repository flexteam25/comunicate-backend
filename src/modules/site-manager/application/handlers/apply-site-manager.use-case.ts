import { Injectable, Inject } from '@nestjs/common';
import { SiteManagerApplication } from '../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../infrastructure/persistence/repositories/site-manager-application.repository';
import { ISiteManagerRepository } from '../../infrastructure/persistence/repositories/site-manager.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import {
  badRequest,
  conflict,
  notFound,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface ApplySiteManagerCommand {
  userId: string;
  siteId: string;
  domain: string;
  accountId: string;
  accountPassword: string;
  message?: string;
}

@Injectable()
export class ApplySiteManagerUseCase {
  constructor(
    @Inject('ISiteManagerApplicationRepository')
    private readonly applicationRepository: ISiteManagerApplicationRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: ApplySiteManagerCommand): Promise<SiteManagerApplication> {
    // Validate site exists
    const site = await this.siteRepository.findByIdOrSlug(command.siteId);
    if (!site) {
      throw badRequest(MessageKeys.SITE_NOT_FOUND);
    }

    const siteId = site.id;

    // Check if user is already a manager of this site
    const existingManager = await this.siteManagerRepository.findBySiteAndUser(
      siteId,
      command.userId,
    );
    if (existingManager) {
      throw conflict(MessageKeys.USER_ALREADY_MANAGER_FOR_SITE);
    }

    // Check existing applications
    const existingPending = await this.applicationRepository.findBySiteAndUser(
      siteId,
      command.userId,
      SiteManagerApplicationStatus.PENDING,
    );
    if (existingPending) {
      throw conflict(MessageKeys.PENDING_APPLICATION_EXISTS);
    }

    const existingApproved = await this.applicationRepository.findBySiteAndUser(
      siteId,
      command.userId,
      SiteManagerApplicationStatus.APPROVED,
    );
    if (existingApproved) {
      throw conflict(MessageKeys.APPROVED_APPLICATION_EXISTS);
    }

    // If rejected application exists, create new one (re-apply)
    // Otherwise create new application
    const application = await this.applicationRepository.create({
      siteId,
      userId: command.userId,
      domain: command.domain,
      accountId: command.accountId,
      accountPassword: command.accountPassword,
      message: command.message,
      status: SiteManagerApplicationStatus.PENDING,
    });

    // Reload with relations
    const reloaded = await this.applicationRepository.findById(application.id, [
      'site',
      'user',
    ]);

    if (!reloaded) {
      throw notFound(MessageKeys.APPLICATION_NOT_FOUND_AFTER_CREATE);
    }

    return reloaded;
  }
}

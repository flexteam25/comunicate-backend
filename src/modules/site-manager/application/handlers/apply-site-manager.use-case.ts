import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { SiteManagerApplication } from '../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../infrastructure/persistence/repositories/site-manager-application.repository';
import { ISiteManagerRepository } from '../../infrastructure/persistence/repositories/site-manager.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';

export interface ApplySiteManagerCommand {
  userId: string;
  siteId: string;
  message: string;
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
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new BadRequestException('Site not found');
    }

    // Check if user is already a manager of this site
    const existingManager = await this.siteManagerRepository.findBySiteAndUser(
      command.siteId,
      command.userId,
    );
    if (existingManager) {
      throw new ConflictException('User is already a manager for this site');
    }

    // Check existing applications
    const existingPending = await this.applicationRepository.findBySiteAndUser(
      command.siteId,
      command.userId,
      SiteManagerApplicationStatus.PENDING,
    );
    if (existingPending) {
      throw new ConflictException('You already have a pending application');
    }

    const existingApproved = await this.applicationRepository.findBySiteAndUser(
      command.siteId,
      command.userId,
      SiteManagerApplicationStatus.APPROVED,
    );
    if (existingApproved) {
      throw new ConflictException('Application was already approved');
    }

    // If rejected application exists, create new one (re-apply)
    // Otherwise create new application
    const application = await this.applicationRepository.create({
      siteId: command.siteId,
      userId: command.userId,
      message: command.message,
      status: SiteManagerApplicationStatus.PENDING,
    });

    // Reload with relations
    const reloaded = await this.applicationRepository.findById(application.id, [
      'site',
      'user',
    ]);

    if (!reloaded) {
      throw new Error('Failed to reload application after creation');
    }

    return reloaded;
  }
}

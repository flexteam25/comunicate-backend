import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Site } from '../../../../site/domain/entities/site.entity';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { ISiteManagerRepository } from '../../../infrastructure/persistence/repositories/site-manager.repository';

export interface UpdateManagedSiteCommand {
  userId: string;
  siteId: string;
  name?: string;
  categoryId?: string;
  tierId?: string;
  permanentUrl?: string;
  description?: string;
  firstCharge?: number;
  recharge?: number;
  experience?: number;
  logoUrl?: string;
  mainImageUrl?: string;
  siteImageUrl?: string;
}

@Injectable()
export class UpdateManagedSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
  ) {}

  async execute(command: UpdateManagedSiteCommand): Promise<Site> {
    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      command.siteId,
      command.userId,
    );

    if (!manager) {
      throw new ForbiddenException('You do not have permission to edit this site');
    }

    // Validate site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Prepare update data (only allowed fields - no status, manager cannot change status)
    const updateData: Partial<Site> = {};
    if (command.name !== undefined) updateData.name = command.name;
    if (command.categoryId !== undefined) updateData.categoryId = command.categoryId;
    if (command.tierId !== undefined) updateData.tierId = command.tierId || null;
    if (command.permanentUrl !== undefined)
      updateData.permanentUrl = command.permanentUrl || null;
    if (command.description !== undefined)
      updateData.description = command.description || null;
    if (command.firstCharge !== undefined)
      updateData.firstCharge = command.firstCharge || null;
    if (command.recharge !== undefined) updateData.recharge = command.recharge || null;
    if (command.experience !== undefined) updateData.experience = command.experience;
    if (command.logoUrl !== undefined) updateData.logoUrl = command.logoUrl || null;
    if (command.mainImageUrl !== undefined)
      updateData.mainImageUrl = command.mainImageUrl || null;
    if (command.siteImageUrl !== undefined)
      updateData.siteImageUrl = command.siteImageUrl || null;

    // Update site
    const updated = await this.siteRepository.update(command.siteId, updateData);

    // Reload with relations
    const reloaded = await this.siteRepository.findById(updated.id, [
      'category',
      'tier',
      'siteBadges',
      'siteBadges.badge',
      'siteDomains',
    ]);

    if (!reloaded) {
      throw new Error('Failed to reload site after update');
    }

    return reloaded;
  }
}

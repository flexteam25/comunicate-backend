import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ISiteRepository } from "../../../infrastructure/persistence/repositories/site.repository";
import { ISiteBadgeRepository } from "../../../infrastructure/persistence/repositories/site-badge.repository";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Badge,
  BadgeType,
} from "../../../../badge/domain/entities/badge.entity";
import { SiteBadge } from "../../../domain/entities/site-badge.entity";

export interface AssignBadgeCommand {
  siteId: string;
  badgeId: string;
}

@Injectable()
export class AssignBadgeToSiteUseCase {
  constructor(
    @Inject("ISiteRepository")
    private readonly siteRepository: ISiteRepository,
    @Inject("ISiteBadgeRepository")
    private readonly siteBadgeRepository: ISiteBadgeRepository,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>
  ) {}

  async execute(command: AssignBadgeCommand): Promise<SiteBadge> {
    // Check if site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException("Site not found");
    }

    // Check if badge exists, is active, and is of type 'site'
    const badge = await this.badgeRepository.findOne({
      where: {
        id: command.badgeId,
        deletedAt: null,
        isActive: true,
        badgeType: BadgeType.SITE,
      },
    });
    if (!badge) {
      throw new BadRequestException("Badge not found");
    }
    if (badge.badgeType !== BadgeType.SITE) {
      throw new BadRequestException('Badge must be of type "site"');
    }

    // Check if already assigned
    const hasBadge = await this.siteBadgeRepository.hasBadge(
      command.siteId,
      command.badgeId
    );
    if (hasBadge) {
      throw new BadRequestException("Badge already assigned to this site");
    }

    // Assign badge
    return this.siteBadgeRepository.assignBadge(
      command.siteId,
      command.badgeId
    );
  }
}

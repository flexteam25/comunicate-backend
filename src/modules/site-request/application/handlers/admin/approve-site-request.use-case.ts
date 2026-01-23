import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { ISiteCategoryRepository } from '../../../../site/infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import { Site, SiteStatus } from '../../../../site/domain/entities/site.entity';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from '../../../../../shared/services/upload/storage-provider.interface';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

export interface ApproveSiteRequestCommand {
  requestId: string;
  adminId: string;
  slug?: string;
  points: number;
  status?: SiteStatus;
  tierId?: string;
  categoryId?: string;
}

@Injectable()
export class ApproveSiteRequestUseCase {
  private readonly apiServiceUrl: string;
  private readonly uploadBaseUrl: string;

  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
    this.uploadBaseUrl = this.configService.get<string>('UPLOAD_BASE_URL') || '/uploads';
  }

  async execute(
    command: ApproveSiteRequestCommand,
  ): Promise<{ site: Site; request: SiteRequest }> {
    // Validate points (required, min 0)
    if (command.points === undefined || command.points === null) {
      throw new BadRequestException('Points is required');
    }
    if (command.points < 0) {
      throw new BadRequestException('Points must be at least 0');
    }

    // Find request with relations
    const request = await this.siteRequestRepository.findById(command.requestId, [
      'user',
      'category',
      'tier',
    ]);

    if (!request) {
      throw new NotFoundException('Site request not found');
    }

    // Only allow approve if status = pending
    if (request.status !== SiteRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // Validate category if admin override
    let finalCategoryId = request.categoryId;
    if (command.categoryId) {
      const category = await this.siteCategoryRepository.findById(command.categoryId);
      if (!category) {
        throw new BadRequestException('Category not found');
      }
      finalCategoryId = command.categoryId;
    }

    // Validate tier if admin override
    let finalTierId = request.tierId || undefined;
    if (command.tierId !== undefined) {
      if (command.tierId) {
        const tier = await this.tierRepository.findById(command.tierId);
        if (!tier) {
          throw new BadRequestException('Tier not found');
        }
      }
      finalTierId = command.tierId || undefined;
    }

    // Generate or validate slug
    let finalSlug: string;
    if (command.slug) {
      // Validate unique slug
      const existingSite = await this.siteRepository.findByIdOrSlug(command.slug);
      if (existingSite) {
        throw new BadRequestException('Site with this slug already exists');
      }
      // Also check approved requests with this slug
      const approvedRequests = await this.siteRequestRepository.findAll(
        {
          status: SiteRequestStatus.APPROVED,
        },
        undefined,
        100,
      );
      const hasApprovedWithSlug = approvedRequests.data.some(
        (r) => r.slug === command.slug && r.id !== command.requestId,
      );
      if (hasApprovedWithSlug) {
        throw new BadRequestException('Site with this slug already exists');
      }
      finalSlug = command.slug;
    } else {
      // Generate slug from name
      finalSlug = this.generateSlug(request.name);
      // Make slug unique
      finalSlug = await this.makeSlugUnique(finalSlug, command.requestId);
    }

    // Generate site ID
    const siteId = randomUUID();

    // Move files from request folder to site folder
    let newLogoUrl: string | undefined;
    let newMainImageUrl: string | undefined;
    let newSiteImageUrl: string | undefined;

    try {
      if (request.logoUrl) {
        newLogoUrl = await this.moveFileToSite(request.logoUrl, siteId, 'logo');
      }
      if (request.mainImageUrl) {
        newMainImageUrl = await this.moveFileToSite(request.mainImageUrl, siteId, 'main');
      }
      if (request.siteImageUrl) {
        newSiteImageUrl = await this.moveFileToSite(request.siteImageUrl, siteId, 'site');
      }

      // Execute all operations in transaction
      const result = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const siteRepo = manager.getRepository(Site);
          const requestRepo = manager.getRepository(SiteRequest);
          const userProfileRepo = manager.getRepository(UserProfile);
          const pointTransactionRepo = manager.getRepository(PointTransaction);

          // Create site from request data
          const site = siteRepo.create({
            id: siteId,
            name: request.name,
            slug: finalSlug,
            categoryId: finalCategoryId,
            logoUrl: newLogoUrl,
            mainImageUrl: newMainImageUrl,
            siteImageUrl: newSiteImageUrl,
            tierId: finalTierId,
            permanentUrl: request.permanentUrl,
            description: request.description,
            firstCharge: request.firstCharge,
            recharge: request.recharge,
            experience: request.experience || 0,
            status: command.status || SiteStatus.VERIFIED,
            reviewCount: 0,
            averageRating: 0,
          });

          const savedSite = await siteRepo.save(site);

          // Update request status = approved, link to site, save admin_id
          await requestRepo.update(command.requestId, {
            status: SiteRequestStatus.APPROVED,
            siteId: savedSite.id,
            adminId: command.adminId,
            slug: finalSlug,
          });

          // Get updated request
          const updatedRequest = await requestRepo.findOne({
            where: { id: command.requestId },
            relations: ['user', 'category', 'tier', 'site', 'admin'],
          });

          if (!updatedRequest) {
            throw new NotFoundException('Site request not found after update');
          }

          // Add points to user with pessimistic lock
          const userProfile = await userProfileRepo.findOne({
            where: { userId: request.userId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!userProfile) {
            throw new NotFoundException('User profile not found');
          }

          const previousPoints = userProfile.points;
          const newBalance = previousPoints + command.points;

          userProfile.points = newBalance;
          await userProfileRepo.save(userProfile);

          // Create point transaction
          const pointTransaction = pointTransactionRepo.create({
            userId: request.userId,
            type: PointTransactionType.EARN,
            amount: command.points,
            balanceAfter: newBalance,
            category: 'site_request_reward',
            referenceType: 'site_request',
            referenceId: request.id,
            description: `Site request approved: ${request.name}`,
          });
          await pointTransactionRepo.save(pointTransaction);

          return {
            site: savedSite,
            request: updatedRequest,
            previousPoints,
            newBalance,
          };
        },
      );

      // Reload site with relations for response
      const siteWithRelations = await this.siteRepository.findById(siteId, [
        'category',
        'tier',
        'siteBadges',
        'siteBadges.badge',
        'siteDomains',
        'siteManagers',
        'siteManagers.user',
      ]);

      if (!siteWithRelations) {
        throw new NotFoundException('Site not found after creation');
      }

      // Reload request with all relations for events
      const requestWithRelations = await this.siteRequestRepository.findById(
        command.requestId,
        ['user', 'category', 'tier', 'site', 'admin'],
      );

      if (!requestWithRelations) {
        throw new NotFoundException('Site request not found after approval');
      }

      // Publish real-time events after transaction
      setImmediate(() => {
        this.publishEvents(
          siteWithRelations,
          requestWithRelations,
          result.previousPoints,
          result.newBalance,
          command.points,
        ).catch((error) => {
          this.logger.error(
            'Failed to publish site-request:approved events',
            {
              error: error instanceof Error ? error.message : String(error),
              requestId: command.requestId,
              siteId,
            },
            'site-request',
          );
        });
      });

      return {
        site: siteWithRelations,
        request: requestWithRelations,
      };
    } catch (error) {
      // If transaction fails, try to cleanup moved files (best effort)
      if (newLogoUrl || newMainImageUrl || newSiteImageUrl) {
        try {
          if (newLogoUrl) await this.storageProvider.delete(newLogoUrl);
          if (newMainImageUrl) await this.storageProvider.delete(newMainImageUrl);
          if (newSiteImageUrl) await this.storageProvider.delete(newSiteImageUrl);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Move file from request folder to site folder
   */
  private async moveFileToSite(
    sourceUrl: string,
    siteId: string,
    imageType: 'logo' | 'main' | 'site',
  ): Promise<string> {
    // Extract filename from source URL (e.g., /uploads/site-requests/{requestId}/logo/{filename})
    const urlParts = sourceUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || `${imageType}.webp`;

    // Create destination path: sites/{siteId}/{filename}
    // Destination URL format: /uploads/sites/{siteId}/{filename}
    const destRelativePath = `sites/${siteId}/${filename}`;
    const destUrl = `${this.uploadBaseUrl}/${destRelativePath}`;

    // Move file using StorageProvider
    try {
      const movedPath: string = await this.storageProvider.move(
        sourceUrl,
        destUrl,
      );
      return movedPath;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to move file from request to site folder',
        {
          sourceUrl,
          destUrl,
          siteId,
          imageType,
          error: errorMessage,
        },
        'site-request',
      );
      throw new BadRequestException('Failed to move file to site folder');
    }
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    if (!name || name.trim().length === 0) {
      return 'site';
    }

    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    if (slug.length === 0) {
      slug = 'site';
    }

    // Limit to 50 characters
    return slug.substring(0, 50);
  }

  /**
   * Make slug unique by checking with existing sites and approved requests
   */
  private async makeSlugUnique(
    baseSlug: string,
    excludeRequestId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      // Check with sites
      const existingSite = await this.siteRepository.findByIdOrSlug(slug);
      if (existingSite) {
        const suffix = `-${counter}`;
        slug = (baseSlug.substring(0, 50 - suffix.length) + suffix).replace(/-$/, '');
        counter++;
        continue;
      }

      // Check with approved requests
      const approvedRequests = await this.siteRequestRepository.findAll(
        { status: SiteRequestStatus.APPROVED },
        undefined,
        100,
      );
      const hasApprovedWithSlug = approvedRequests.data.some(
        (r) => r.slug === slug && r.id !== excludeRequestId,
      );

      if (!hasApprovedWithSlug) {
        return slug;
      }

      const suffix = `-${counter}`;
      slug = (baseSlug.substring(0, 50 - suffix.length) + suffix).replace(/-$/, '');
      counter++;
    }
  }

  /**
   * Publish real-time events
   */
  private async publishEvents(
    site: Site,
    request: SiteRequest,
    previousPoints: number,
    newBalance: number,
    pointsAwarded: number,
  ): Promise<void> {
    // Map site to response format for event
    const siteData: Record<string, any> = this.mapSiteToResponse(site);

    // Map request to response format for event
    const requestData: Record<string, any> = this.mapRequestToResponse(
      request,
      siteData,
    );

    // Publish site-request:approved event to user room
    await this.redisService.publishEvent(
      RedisChannel.SITE_REQUEST_APPROVED as string,
      {
        ...requestData,
        userId: request.userId, // Include userId so socket gateway can route to user.{userId}
        pointsAwarded,
      },
    );

    // Publish site-request:approved event to admin room (without userId)
    await this.redisService.publishEvent(
      RedisChannel.SITE_REQUEST_APPROVED as string,
      requestData,
    );

    // Publish point:updated event to user room
    await this.redisService.publishEvent(
      RedisChannel.POINT_UPDATED as string,
      {
        userId: request.userId,
        pointsDelta: pointsAwarded,
        previousPoints,
        newPoints: newBalance,
        transactionType: PointTransactionType.EARN,
        updatedAt: new Date(),
      },
    );
  }

  private mapSiteToResponse(site: Site): Record<string, any> {
    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      category: site.category
        ? {
            id: site.category.id,
            name: site.category.name,
            nameKo: site.category.nameKo || null,
            description: site.category.description || null,
          }
        : {
            id: '',
            name: '',
            nameKo: null,
          },
      logoUrl: buildFullUrl(this.apiServiceUrl, site.logoUrl || null) || null,
      mainImageUrl: buildFullUrl(this.apiServiceUrl, site.mainImageUrl || null) || null,
      siteImageUrl: buildFullUrl(this.apiServiceUrl, site.siteImageUrl || null) || null,
      tier: site.tier
        ? {
            id: site.tier.id,
            name: site.tier.name,
            description: site.tier.description || null,
            order: site.tier.order,
            color: site.tier.color || null,
          }
        : null,
      permanentUrl: site.permanentUrl || null,
      status: site.status,
      description: site.description || null,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      firstCharge: site.firstCharge ? Number(site.firstCharge) : null,
      recharge: site.recharge ? Number(site.recharge) : null,
      experience: site.experience,
      issueCount: site.issueCount || 0,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }

  private mapRequestToResponse(
    request: SiteRequest,
    siteData?: Record<string, any>,
  ): Record<string, any> {
    return {
      id: request.id,
      userId: request.userId,
      user: request.user
        ? {
            id: request.user.id,
            email: request.user.email,
            displayName: request.user.displayName || null,
          }
        : null,
      name: request.name,
      slug: request.slug || null,
      categoryId: request.categoryId,
      category: request.category
        ? {
            id: request.category.id,
            name: request.category.name,
            nameKo: request.category.nameKo || null,
          }
        : null,
      status: request.status,
      siteId: request.siteId || null,
      site: siteData || (request.site ? this.mapSiteToResponse(request.site) : null),
      adminId: request.adminId || null,
      admin: request.admin
        ? {
            id: request.admin.id,
            email: request.admin.email,
            displayName: request.admin.displayName || null,
          }
        : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}

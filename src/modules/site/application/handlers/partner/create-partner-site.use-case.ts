import { Injectable, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteCategoryRepository } from '../../../infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';
import {
  SiteManager,
  SiteManagerRole,
} from '../../../../site-manager/domain/entities/site-manager.entity';
import { User } from '../../../../user/domain/entities/user.entity';
import { UserRole } from '../../../../user/domain/entities/user-role.entity';
import { Role } from '../../../../user/domain/entities/role.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import {
  badRequest,
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CreatePartnerSiteCommand {
  userId: string;
  name: string;
  slug: string;
  categoryId: string;
  logo?: MulterFile;
  mainImage?: MulterFile;
  siteImage?: MulterFile;
  tierId?: string;
  permanentUrl?: string;
  description?: string;
  firstCharge?: number;
  recharge?: number;
  experience?: number;
}

@Injectable()
export class CreatePartnerSiteUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: CreatePartnerSiteCommand): Promise<Site> {
    // Validate category exists
    const category = await this.siteCategoryRepository.findById(command.categoryId);
    if (!category) {
      throw badRequest(MessageKeys.CATEGORY_NOT_FOUND);
    }

    // Validate tier exists if provided
    if (command.tierId) {
      const tier = await this.tierRepository.findById(command.tierId);
      if (!tier) {
        throw badRequest(MessageKeys.TIER_NOT_FOUND);
      }
    }

    // Validate file sizes (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (command.logo && command.logo.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
        fileType: 'logo',
        maxSize: '20MB',
      });
    }
    if (command.mainImage && command.mainImage.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
        fileType: 'main image',
        maxSize: '20MB',
      });
    }
    if (command.siteImage && command.siteImage.size > maxSize) {
      throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
        fileType: 'site image',
        maxSize: '20MB',
      });
    }

    // Validate file types
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.logo && !allowedTypes.test(command.logo.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }
    if (command.mainImage && !allowedTypes.test(command.mainImage.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }
    if (command.siteImage && !allowedTypes.test(command.siteImage.mimetype)) {
      throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
        allowedTypes: 'jpg, jpeg, png, webp',
      });
    }

    // Generate site ID first
    const siteId = randomUUID();

    // Upload images before transaction
    let logoUrl: string | undefined;
    let mainImageUrl: string | undefined;
    let siteImageUrl: string | undefined;

    if (command.logo) {
      const result = await this.uploadService.uploadSiteImage(
        command.logo,
        siteId,
        'logo',
      );
      logoUrl = result.relativePath;
    }

    if (command.mainImage) {
      const result = await this.uploadService.uploadSiteImage(
        command.mainImage,
        siteId,
        'main',
      );
      mainImageUrl = result.relativePath;
    }

    if (command.siteImage) {
      const result = await this.uploadService.uploadSiteImage(
        command.siteImage,
        siteId,
        'site',
      );
      siteImageUrl = result.relativePath;
    }

    // Create site within transaction with uploaded image URLs
    try {
      const site = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const siteRepo = manager.getRepository(Site);
          const userRepo = manager.getRepository(User);
          const roleRepo = manager.getRepository(Role);
          const userRoleRepo = manager.getRepository(UserRole);
          const siteManagerRepo = manager.getRepository(SiteManager);

          // Validate user exists and has partner role
          const partnerUser = await userRepo.findOne({
            where: { id: command.userId, deletedAt: null },
            relations: ['userRoles', 'userRoles.role'],
          });

          if (!partnerUser) {
            throw notFound(MessageKeys.USER_NOT_FOUND);
          }

          // Find partner role
          const partnerRole = await roleRepo.findOne({
            where: { name: 'partner', deletedAt: null },
          });

          if (!partnerRole) {
            throw notFound(MessageKeys.PARTNER_ROLE_NOT_FOUND);
          }

          // Check if user has partner role
          const hasPartnerRole = partnerUser.userRoles?.some(
            (ur) => ur.role?.name === 'partner',
          );

          if (!hasPartnerRole) {
            throw forbidden(MessageKeys.USER_DOES_NOT_HAVE_PARTNER_ROLE);
          }

          // Check duplicate name (case-insensitive), excluding soft-deleted
          const duplicate = await siteRepo
            .createQueryBuilder('s')
            .where('LOWER(s.name) = LOWER(:name)', { name: command.name })
            .andWhere('s.deletedAt IS NULL')
            .getOne();
          if (duplicate) {
            throw badRequest(MessageKeys.SITE_NAME_ALREADY_EXISTS);
          }

          // Check duplicate slug, excluding soft-deleted
          const duplicateSlug = await siteRepo
            .createQueryBuilder('s')
            .where('s.slug = :slug', { slug: command.slug })
            .andWhere('s.deletedAt IS NULL')
            .getOne();
          if (duplicateSlug) {
            throw badRequest(MessageKeys.SITE_SLUG_ALREADY_EXISTS);
          }

          const site = siteRepo.create({
            id: siteId,
            name: command.name,
            slug: command.slug,
            categoryId: command.categoryId,
            logoUrl,
            mainImageUrl,
            siteImageUrl,
            tierId: command.tierId,
            permanentUrl: command.permanentUrl,
            description: command.description,
            firstCharge: command.firstCharge,
            recharge: command.recharge,
            experience: command.experience || 0,
            status: SiteStatus.UNVERIFIED, // Partner sites start as UNVERIFIED
            reviewCount: 0,
            averageRating: 0,
          });

          const savedSite = await siteRepo.save(site);

          // Create site_manager record - partner automatically becomes manager
          const siteManager = siteManagerRepo.create({
            siteId: savedSite.id,
            userId: command.userId,
            role: SiteManagerRole.MANAGER,
            isActive: true,
          });
          await siteManagerRepo.save(siteManager);

          return savedSite;
        },
      );

      // Reload site with relationships for response
      const siteWithRelations = await this.siteRepository.findById(site.id, [
        'category',
        'tier',
        'siteBadges',
        'siteBadges.badge',
        'siteDomains',
      ]);

      if (!siteWithRelations) {
        throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_CREATE);
      }

      // Map site to response format for event
      const eventData = this.mapSiteToResponse(siteWithRelations);

      // Publish site created event to Redis
      try {
        await this.redisService.publishEvent(RedisChannel.SITE_CREATED, eventData);
      } catch (error) {
        // Log error but don't fail the request
        this.logger.error(
          'Failed to publish site:created event',
          {
            error: error instanceof Error ? error.message : String(error),
            siteId: siteWithRelations.id,
          },
          'site',
        );
      }

      return siteWithRelations;
    } catch (transactionError) {
      // If transaction fails, cleanup uploaded files (best effort)
      const cleanupPromises: Promise<void>[] = [];
      if (logoUrl) {
        cleanupPromises.push(this.uploadService.deleteFile(logoUrl));
      }
      if (mainImageUrl) {
        cleanupPromises.push(this.uploadService.deleteFile(mainImageUrl));
      }
      if (siteImageUrl) {
        cleanupPromises.push(this.uploadService.deleteFile(siteImageUrl));
      }
      // Attempt cleanup (ignore cleanup errors to avoid masking original error)
      await Promise.allSettled(cleanupPromises);
      throw transactionError;
    }
  }

  private mapSiteToResponse(site: Site): any {
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
      badges: (site.siteBadges || [])
        .map((sb) => {
          // Filter out if badge is null or deleted
          if (!sb.badge || sb.badge.deletedAt) {
            return null;
          }
          return {
            id: sb.badge.id,
            name: sb.badge.name,
            description: sb.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || null,
            iconName: sb.badge.iconName || null,
          };
        })
        .filter((badge): badge is NonNullable<typeof badge> => badge !== null),
      domains: (site.siteDomains || []).map((sd) => ({
        id: sd.id,
        domain: sd.domain,
        isActive: sd.isActive,
        isCurrent: sd.isCurrent,
      })),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }
}

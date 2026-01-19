import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteCategoryRepository } from '../../../infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import {
  Site,
  SiteStatus,
  TetherDepositWithdrawalStatus,
} from '../../../domain/entities/site.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager, In } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
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
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateSiteCommand {
  siteId: string;
  name?: string;
  slug?: string;
  categoryId?: string;
  logo?: MulterFile;
  mainImage?: MulterFile;
  siteImage?: MulterFile;
  deleteLogo?: boolean;
  deleteMainImage?: boolean;
  deleteSiteImage?: boolean;
  tierId?: string;
  permanentUrl?: string;
  accessibleUrl?: string;
  status?: SiteStatus;
  description?: string;
  firstCharge?: number;
  recharge?: number;
  experience?: number;
  partnerUid?: string[];
  removePartnerUid?: string[];
  tetherDepositWithdrawalStatus?: TetherDepositWithdrawalStatus;
}

@Injectable()
export class UpdateSiteUseCase {
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

  async execute(command: UpdateSiteCommand): Promise<Site> {
    // Get existing site first to check for old files and validate
    const existingSite = await this.siteRepository.findById(command.siteId);
    if (!existingSite) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
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

    // Store old file URLs for cleanup
    const oldLogoUrl = existingSite.logoUrl;
    const oldMainImageUrl = existingSite.mainImageUrl;
    const oldSiteImageUrl = existingSite.siteImageUrl;

    // Upload new images before transaction
    let logoUrl: string | undefined;
    let mainImageUrl: string | undefined;
    let siteImageUrl: string | undefined;

    if (command.logo) {
      const result = await this.uploadService.uploadSiteImage(
        command.logo,
        command.siteId,
        'logo',
      );
      logoUrl = result.relativePath;
    } else if (command.deleteLogo) {
      logoUrl = null;
    }

    if (command.mainImage) {
      const result = await this.uploadService.uploadSiteImage(
        command.mainImage,
        command.siteId,
        'main',
      );
      mainImageUrl = result.relativePath;
    } else if (command.deleteMainImage) {
      mainImageUrl = null;
    }

    if (command.siteImage) {
      const result = await this.uploadService.uploadSiteImage(
        command.siteImage,
        command.siteId,
        'site',
      );
      siteImageUrl = result.relativePath;
    } else if (command.deleteSiteImage) {
      siteImageUrl = null;
    }

    // Update site within transaction
    try {
      const siteId = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const siteRepo = manager.getRepository(Site);

          // Validate category if provided
          if (command.categoryId) {
            const category = await this.siteCategoryRepository.findById(
              command.categoryId,
            );
            if (!category) {
              throw badRequest(MessageKeys.CATEGORY_NOT_FOUND);
            }
          }

          // Validate tier if provided
          if (command.tierId !== undefined && command.tierId) {
            const tier = await this.tierRepository.findById(command.tierId);
            if (!tier) {
              throw badRequest(MessageKeys.TIER_NOT_FOUND);
            }
          }

          // Check duplicate name if name is being updated (case-insensitive, exclude current site)
          if (command.name !== undefined && command.name !== existingSite.name) {
            const duplicate = await siteRepo
              .createQueryBuilder('s')
              .where('LOWER(s.name) = LOWER(:name)', { name: command.name })
              .andWhere('s.id != :siteId', { siteId: command.siteId })
              .andWhere('s.deletedAt IS NULL')
              .getOne();
            if (duplicate) {
              throw badRequest(MessageKeys.SITE_NAME_ALREADY_EXISTS);
            }
          }

          // Check duplicate slug if slug is being updated (only if slug has value and is different)
          if (
            command.slug !== undefined &&
            command.slug !== null &&
            command.slug !== '' &&
            command.slug !== existingSite.slug
          ) {
            const duplicateSlug = await siteRepo
              .createQueryBuilder('s')
              .where('s.slug = :slug', { slug: command.slug })
              .andWhere('s.id != :siteId', { siteId: command.siteId })
              .andWhere('s.deletedAt IS NULL')
              .getOne();
            if (duplicateSlug) {
              throw badRequest(MessageKeys.SITE_SLUG_ALREADY_EXISTS);
            }
          }

          // Build update data
          const updateData: Partial<Site> = {};
          if (command.name !== undefined) updateData.name = command.name;
          // Only update slug if it has a value (not null, not empty string)
          if (
            command.slug !== undefined &&
            command.slug !== null &&
            command.slug !== ''
          ) {
            updateData.slug = command.slug;
          }
          if (command.categoryId !== undefined)
            updateData.categoryId = command.categoryId;
          if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
          if (mainImageUrl !== undefined) updateData.mainImageUrl = mainImageUrl;
          if (siteImageUrl !== undefined) updateData.siteImageUrl = siteImageUrl;
          if (command.tierId !== undefined) updateData.tierId = command.tierId || null;
          if (command.permanentUrl !== undefined)
            updateData.permanentUrl = command.permanentUrl;
          if (command.accessibleUrl !== undefined)
            updateData.accessibleUrl = command.accessibleUrl;
          if (command.status !== undefined) updateData.status = command.status;
          if (command.description !== undefined)
            updateData.description = command.description || null;
          if (command.firstCharge !== undefined)
            updateData.firstCharge = command.firstCharge || null;
          if (command.recharge !== undefined)
            updateData.recharge = command.recharge || null;
          if (command.experience !== undefined)
            updateData.experience = command.experience;
          if (command.tetherDepositWithdrawalStatus !== undefined)
            updateData.tetherDepositWithdrawalStatus =
              command.tetherDepositWithdrawalStatus;

          await siteRepo.update(command.siteId, updateData);

          // Handle partnerUid updates
          if (command.partnerUid && command.partnerUid.length > 0) {
            const siteManagerRepo = manager.getRepository(SiteManager);
            const userRepo = manager.getRepository(User);
            const roleRepo = manager.getRepository(Role);
            const userRoleRepo = manager.getRepository(UserRole);

            // Find partner role
            const partnerRole = await roleRepo.findOne({
              where: { name: 'partner', deletedAt: null },
            });

            if (!partnerRole) {
              throw notFound(MessageKeys.PARTNER_ROLE_NOT_FOUND);
            }

            // Batch validate all users exist
            const partnerUsers = await userRepo.find({
              where: { id: In(command.partnerUid), deletedAt: null },
            });

            const foundUserIds = new Set(partnerUsers.map((u) => u.id));
            const missingUserIds = command.partnerUid.filter(
              (id) => !foundUserIds.has(id),
            );
            if (missingUserIds.length > 0) {
              throw notFound(MessageKeys.PARTNER_USER_NOT_FOUND, {
                userIds: missingUserIds.join(', '),
              });
            }

            // Batch validate all users have partner role
            const userRoles = await userRoleRepo.find({
              where: {
                userId: In(command.partnerUid),
                roleId: partnerRole.id,
              },
            });

            const usersWithPartnerRole = new Set(userRoles.map((ur) => ur.userId));
            const usersWithoutPartnerRole = command.partnerUid.filter(
              (id) => !usersWithPartnerRole.has(id),
            );
            if (usersWithoutPartnerRole.length > 0) {
              throw badRequest(MessageKeys.USER_DOES_NOT_HAVE_PARTNER_ROLE, {
                userIds: usersWithoutPartnerRole.join(', '),
              });
            }

            // Batch query existing site managers
            const existingManagers = await siteManagerRepo.find({
              where: {
                siteId: command.siteId,
                userId: In(command.partnerUid),
              },
            });

            const existingManagerMap = new Map(
              existingManagers.map((m) => [m.userId, m]),
            );

            // Prepare managers to update and create
            const managersToUpdate: SiteManager[] = [];
            const managersToCreate: Partial<SiteManager>[] = [];

            for (const partnerUid of command.partnerUid) {
              const existingManager = existingManagerMap.get(partnerUid);

              if (existingManager) {
                // If exists and already active, skip
                if (!existingManager.isActive) {
                  // If exists but inactive, set to active
                  existingManager.isActive = true;
                  managersToUpdate.push(existingManager);
                }
              } else {
                // Create new SiteManager with isActive = true
                managersToCreate.push({
                  siteId: command.siteId,
                  userId: partnerUid,
                  role: SiteManagerRole.MANAGER,
                  isActive: true,
                });
              }
            }

            // Bulk update existing managers
            if (managersToUpdate.length > 0) {
              await siteManagerRepo.save(managersToUpdate);
            }

            // Bulk create new managers
            if (managersToCreate.length > 0) {
              const newManagers = siteManagerRepo.create(managersToCreate);
              await siteManagerRepo.save(newManagers);
            }
          }

          // Handle removePartnerUid (set isActive = false)
          if (command.removePartnerUid && command.removePartnerUid.length > 0) {
            const siteManagerRepo = manager.getRepository(SiteManager);

            // Batch query existing site managers
            const existingManagers = await siteManagerRepo.find({
              where: {
                siteId: command.siteId,
                userId: In(command.removePartnerUid),
              },
            });

            const existingManagerMap = new Map(
              existingManagers.map((m) => [m.userId, m]),
            );

            // Validate all users are managers of this site
            const missingManagerIds = command.removePartnerUid.filter(
              (id) => !existingManagerMap.has(id),
            );
            if (missingManagerIds.length > 0) {
              throw new BadRequestException(
                `Users are not managers of this site: ${missingManagerIds.join(', ')}`,
              );
            }

            // Bulk update: set isActive = false
            const managersToDeactivate = existingManagers.map((m) => {
              m.isActive = false;
              return m;
            });

            if (managersToDeactivate.length > 0) {
              await siteManagerRepo.save(managersToDeactivate);
            }
          }

          return command.siteId; // Return ID to reload with relationships outside transaction
        },
      );

      // Reload site with relationships for response (outside transaction)
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
        throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
      }

      // Check if status changed to VERIFIED and publish event
      const statusChangedToVerified =
        existingSite.status !== SiteStatus.VERIFIED &&
        siteWithRelations.status === SiteStatus.VERIFIED;

      if (statusChangedToVerified) {
        // Map site to response format for event
        const eventData = this.mapSiteToResponse(siteWithRelations);

        // Get all managers (partners) of this site
        const managers = await this.siteManagerRepository.findBySiteId(siteId);
        const partnerUserIds = managers.filter((m) => m.isActive).map((m) => m.userId);

        // Publish event after transaction (fire and forget)
        setImmediate(() => {
          // Send to all partner managers
          partnerUserIds.forEach((userId) => {
            this.redisService
              .publishEvent(RedisChannel.SITE_VERIFIED, {
                ...eventData,
                userId, // Include userId so socket gateway can route to user.{userId}
              })
              .catch((error) => {
                this.logger.error(
                  'Failed to publish site:verified event to partner',
                  {
                    error: error instanceof Error ? error.message : String(error),
                    siteId,
                    userId,
                  },
                  'site',
                );
              });
          });

          // Send to all admins (without userId)
          this.redisService
            .publishEvent(RedisChannel.SITE_VERIFIED, eventData)
            .catch((error) => {
              this.logger.error(
                'Failed to publish site:verified event to admins',
                {
                  error: error instanceof Error ? error.message : String(error),
                  siteId,
                },
                'site',
              );
            });
        });
      }

      // Delete old files after successful update (best effort, asynchronously)
      const deletePromises: Promise<void>[] = [];
      if (logoUrl && oldLogoUrl) {
        deletePromises.push(this.uploadService.deleteFile(oldLogoUrl));
      }
      if (mainImageUrl && oldMainImageUrl) {
        deletePromises.push(this.uploadService.deleteFile(oldMainImageUrl));
      }
      if (siteImageUrl && oldSiteImageUrl) {
        deletePromises.push(this.uploadService.deleteFile(oldSiteImageUrl));
      }
      if (command.deleteLogo && oldLogoUrl) {
        deletePromises.push(this.uploadService.deleteFile(oldLogoUrl));
      }
      if (command.deleteMainImage && oldMainImageUrl) {
        deletePromises.push(this.uploadService.deleteFile(oldMainImageUrl));
      }
      if (command.deleteSiteImage && oldSiteImageUrl) {
        deletePromises.push(this.uploadService.deleteFile(oldSiteImageUrl));
      }
      // Delete old files asynchronously (don't wait)
      Promise.allSettled(deletePromises).catch(() => {
        // Ignore cleanup errors
      });

      return siteWithRelations;
    } catch (transactionError) {
      // If transaction fails, cleanup newly uploaded files (best effort)
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
            iconUrl: buildFullUrl(this.apiServiceUrl, site.tier.iconUrl || null) || null,
            iconName: site.tier.iconName || null,
          }
        : null,
      permanentUrl: site.permanentUrl || null,
      accessibleUrl: site.accessibleUrl || null,
      status: site.status,
      description: site.description || null,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      firstCharge: site.firstCharge ? Number(site.firstCharge) : null,
      recharge: site.recharge ? Number(site.recharge) : null,
      experience: site.experience,
      issueCount: site.issueCount || 0,
      tetherDepositWithdrawalStatus: site.tetherDepositWithdrawalStatus,
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

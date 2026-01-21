import { Injectable, Inject } from '@nestjs/common';
import { Site, SiteStatus } from '../../../../site/domain/entities/site.entity';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { ISiteManagerRepository } from '../../../infrastructure/persistence/repositories/site-manager.repository';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { ISiteCategoryRepository } from '../../../../site/infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import {
  notFound,
  forbidden,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateManagedSiteCommand {
  userId: string;
  siteId: string;
  name?: string;
  slug?: string;
  categoryId?: string;
  tierId?: string;
  permanentUrl: string;
  accessibleUrl: string;
  description?: string;
  firstCharge?: number;
  recharge?: number;
  experience?: number;
  logo?: MulterFile;
  mainImage?: MulterFile;
  siteImage?: MulterFile;
  deleteLogo?: boolean;
  deleteMainImage?: boolean;
  deleteSiteImage?: boolean;
}

@Injectable()
export class UpdateManagedSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateManagedSiteCommand): Promise<Site> {
    // Resolve site by ID or slug first
    const site = await this.siteRepository.findByIdOrSlug(command.siteId);
    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    const siteId = site.id;

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      siteId,
      command.userId,
    );

    if (!manager) {
      throw forbidden(MessageKeys.NO_PERMISSION_TO_EDIT_SITE);
    }

    // Use resolved site as existing site to check for old files and validate
    const existingSite = site;

    // Partner can only update site if it's already VERIFIED
    // (Partner cannot update UNVERIFIED sites - they need admin approval first)
    if (
      existingSite.status !== SiteStatus.VERIFIED &&
      existingSite.status !== SiteStatus.MONITORED
    ) {
      throw forbidden(MessageKeys.SITE_MUST_BE_VERIFIED_BEFORE_UPDATE);
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
    let logoUrl: string | null | undefined;
    let mainImageUrl: string | null | undefined;
    let siteImageUrl: string | null | undefined;

    if (command.logo) {
      const result = await this.uploadService.uploadSiteImage(
        command.logo,
        siteId,
        'logo',
      );
      logoUrl = result.relativePath;
    } else if (command.deleteLogo) {
      logoUrl = null;
    }

    if (command.mainImage) {
      const result = await this.uploadService.uploadSiteImage(
        command.mainImage,
        siteId,
        'main',
      );
      mainImageUrl = result.relativePath;
    } else if (command.deleteMainImage) {
      mainImageUrl = null;
    }

    if (command.siteImage) {
      const result = await this.uploadService.uploadSiteImage(
        command.siteImage,
        siteId,
        'site',
      );
      siteImageUrl = result.relativePath;
    } else if (command.deleteSiteImage) {
      siteImageUrl = null;
    }

    // Update site within transaction
    try {
      const site = await this.transactionService.executeInTransaction(
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
              .andWhere('s.id != :siteId', { siteId })
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
              .andWhere('s.id != :siteId', { siteId })
              .andWhere('s.deletedAt IS NULL')
              .getOne();
            if (duplicateSlug) {
              throw badRequest(MessageKeys.SITE_SLUG_ALREADY_EXISTS);
            }
          }

          // Build update data (only allowed fields - no status, manager cannot change status)
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
          if (command.permanentUrl !== undefined) {
            updateData.permanentUrl = command.permanentUrl;
          }
          if (command.accessibleUrl !== undefined) {
            updateData.accessibleUrl = command.accessibleUrl;
          }
          if (command.description !== undefined)
            updateData.description = command.description || null;
          if (command.firstCharge !== undefined)
            updateData.firstCharge = command.firstCharge || null;
          if (command.recharge !== undefined)
            updateData.recharge = command.recharge || null;
          if (command.experience !== undefined)
            updateData.experience = command.experience;

          await siteRepo.update(siteId, updateData);
          const updated = await siteRepo.findOne({
            where: { id: siteId, deletedAt: null },
          });
          if (!updated) {
            throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
          }

          return updated;
        },
      );

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

      // Reload with relations
      const reloaded = await this.siteRepository.findById(site.id, [
        'category',
        'tier',
        'siteBadges',
        'siteBadges.badge',
        'siteDomains',
      ]);

      if (!reloaded) {
        throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
      }

      return reloaded;
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
}

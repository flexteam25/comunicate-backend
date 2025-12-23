import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteCategoryRepository } from '../../../infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { randomUUID } from 'crypto';

export interface CreateSiteCommand {
  name: string;
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
export class CreateSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateSiteCommand): Promise<Site> {
    // Validate category exists
    const category = await this.siteCategoryRepository.findById(command.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Validate tier exists if provided
    if (command.tierId) {
      const tier = await this.tierRepository.findById(command.tierId);
      if (!tier) {
        throw new BadRequestException('Tier not found');
      }
    }

    // Validate file sizes (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (command.logo && command.logo.size > maxSize) {
      throw new BadRequestException('Logo file size exceeds 20MB');
    }
    if (command.mainImage && command.mainImage.size > maxSize) {
      throw new BadRequestException('Main image file size exceeds 20MB');
    }
    if (command.siteImage && command.siteImage.size > maxSize) {
      throw new BadRequestException('Site image file size exceeds 20MB');
    }

    // Validate file types
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.logo && !allowedTypes.test(command.logo.mimetype)) {
      throw new BadRequestException(
        'Invalid logo file type. Allowed: jpg, jpeg, png, webp',
      );
    }
    if (command.mainImage && !allowedTypes.test(command.mainImage.mimetype)) {
      throw new BadRequestException(
        'Invalid main image file type. Allowed: jpg, jpeg, png, webp',
      );
    }
    if (command.siteImage && !allowedTypes.test(command.siteImage.mimetype)) {
      throw new BadRequestException(
        'Invalid site image file type. Allowed: jpg, jpeg, png, webp',
      );
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

          // Check duplicate name (case-insensitive), excluding soft-deleted
          const duplicate = await siteRepo
            .createQueryBuilder('s')
            .where('LOWER(s.name) = LOWER(:name)', { name: command.name })
            .andWhere('s.deletedAt IS NULL')
            .getOne();
          if (duplicate) {
            throw new BadRequestException('Site with this name already exists');
          }

          const site = siteRepo.create({
            id: siteId,
            name: command.name,
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
            status: SiteStatus.UNVERIFIED,
            reviewCount: 0,
            averageRating: 0,
          });

          return siteRepo.save(site);
        },
      );
      return site;
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
}

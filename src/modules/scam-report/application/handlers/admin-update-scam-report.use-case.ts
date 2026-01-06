import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { ScamReportImage } from '../../domain/entities/scam-report-image.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';

export interface AdminUpdateScamReportCommand {
  reportId: string;
  adminId: string;
  siteId?: string;
  siteUrl?: string;
  siteName?: string;
  siteAccountInfo?: string;
  registrationUrl?: string;
  contact?: string;
  description?: string;
  amount?: number;
  status?: ScamReportStatus;
  images?: string[];
  deleteImages?: string[];
}

@Injectable()
export class AdminUpdateScamReportUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: AdminUpdateScamReportCommand): Promise<ScamReport> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    // Validate site exists if siteId is being updated
    if (command.siteId !== undefined && command.siteId !== null) {
      const site = await this.siteRepository.findById(command.siteId);
      if (!site) {
        throw new BadRequestException('Site not found');
      }
    }

    const updatedReport = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reportRepo = manager.getRepository(ScamReport);
        const imageRepo = manager.getRepository(ScamReportImage);

        // Build update data (admin can update all fields, including status)
        const updateData: Partial<ScamReport> = {};
        if (command.siteId !== undefined) updateData.siteId = command.siteId;
        if (command.siteUrl !== undefined) updateData.siteUrl = command.siteUrl;
        if (command.siteName !== undefined) updateData.siteName = command.siteName;
        if (command.siteAccountInfo !== undefined)
          updateData.siteAccountInfo = command.siteAccountInfo;
        if (command.registrationUrl !== undefined)
          updateData.registrationUrl = command.registrationUrl;
        if (command.contact !== undefined) updateData.contact = command.contact;
        if (command.description !== undefined)
          updateData.description = command.description;
        if (command.amount !== undefined) updateData.amount = command.amount;
        if (command.status !== undefined) updateData.status = command.status;
        // Note: adminId is not updated when admin updates (only set on create)
        // Note: reviewedAt is not set when admin updates (as per requirements)

        // Update report fields
        if (Object.keys(updateData).length > 0) {
          await reportRepo.update(command.reportId, updateData);
        }

        // Soft delete images if provided
        if (command.deleteImages && command.deleteImages.length > 0) {
          await imageRepo.softDelete(command.deleteImages);
        }

        // Add new images if provided
        if (command.images && command.images.length > 0) {
          // Get current images to determine next order (only non-deleted images)
          const existingImages = await imageRepo.find({
            where: { scamReportId: command.reportId, deletedAt: null },
            order: { order: 'DESC' },
            take: 1,
          });
          const nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0;

          const imageEntities = command.images.map((imageUrl, index) =>
            imageRepo.create({
              scamReportId: command.reportId,
              imageUrl,
              order: nextOrder + index,
            }),
          );
          await imageRepo.save(imageEntities);
        }

        // Reload with relations
        return reportRepo.findOne({
          where: { id: command.reportId },
          relations: ['images', 'user', 'site', 'admin'],
        });
      },
    );

    if (!updatedReport) {
      throw new NotFoundException('Scam report not found after update');
    }

    // Reload with all relations and reaction counts for event
    const reportWithRelations = await this.scamReportRepository.findById(updatedReport.id, [
      'images',
      'user',
      'user.userBadges',
      'user.userBadges.badge',
      'site',
      'admin',
      'reactions', // This will trigger reaction count calculation
    ]);

    if (!reportWithRelations) {
      return updatedReport;
    }

    // Map report to response format (same as admin API response)
    const eventData = this.mapScamReportToResponse(reportWithRelations);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SCAM_REPORT_UPDATED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish scam-report:updated event',
            {
              error: error instanceof Error ? error.message : String(error),
              reportId: updatedReport.id,
              adminId: command.adminId,
            },
            'scam-report',
          );
        });
    });

    return reportWithRelations;
  }

  private mapScamReportToResponse(report: any): any {
    // Use reaction counts from database (counted via subquery)
    const reactions = {
      like: (report as any).likeCount || 0,
      dislike: (report as any).dislikeCount || 0,
    };

    return {
      id: report.id,
      siteId: report.siteId || null,
      siteUrl: report.siteUrl,
      siteName: report.siteName || report.site?.name || null,
      siteAccountInfo: report.siteAccountInfo,
      registrationUrl: report.registrationUrl,
      contact: report.contact,
      userId: report.userId,
      userName: report.user?.displayName || null,
      userEmail: report.user?.email || null,
      userAvatarUrl: buildFullUrl(this.apiServiceUrl, report.user?.avatarUrl || null),
      userBadges: report.user?.userBadges?.map((ub: any) => ({
        name: ub.badge.name,
        iconUrl: buildFullUrl(this.apiServiceUrl, ub.badge.iconUrl || null),
      })) || [],
      description: report.description,
      amount: report.amount ? Number(report.amount) : null,
      status: report.status,
      images: (report.images || []).map((img: any) => ({
        id: img.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl),
        order: img.order,
        createdAt: img.createdAt,
      })),
      reactions,
      adminId: report.adminId || null,
      adminName: report.admin?.displayName || null,
      reviewedAt: report.reviewedAt || null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}

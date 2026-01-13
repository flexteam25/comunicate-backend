import { Injectable, Inject } from '@nestjs/common';
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
import { badRequest, MessageKeys } from '../../../../shared/exceptions/exception-helpers';

export interface CreateScamReportCommand {
  userId: string;
  siteId?: string;
  siteUrl: string;
  siteName: string;
  siteAccountInfo: string;
  registrationUrl: string;
  contact: string;
  description: string;
  amount?: number;
  images?: string[];
  ipAddress?: string;
}

@Injectable()
export class CreateScamReportUseCase {
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

  async execute(command: CreateScamReportCommand): Promise<ScamReport> {
    // Validate site exists if siteId provided
    if (command.siteId) {
      const site = await this.siteRepository.findById(command.siteId);
      if (!site) {
        throw badRequest(MessageKeys.SITE_NOT_FOUND);
      }
    }

    // Create report and images within transaction
    const savedReport = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reportRepo = manager.getRepository(ScamReport);
        const imageRepo = manager.getRepository(ScamReportImage);

        // Create scam report (siteId is stored directly in scam_reports.site_id)
        const report = reportRepo.create({
          userId: command.userId,
          siteId: command.siteId,
          siteUrl: command.siteUrl,
          siteName: command.siteName,
          siteAccountInfo: command.siteAccountInfo,
          registrationUrl: command.registrationUrl,
          contact: command.contact,
          description: command.description,
          amount: command.amount,
          status: ScamReportStatus.PENDING,
          ipAddress: command.ipAddress || null,
        });

        const saved = await reportRepo.save(report);

        // Create images if provided
        if (command.images && command.images.length > 0) {
          const imageEntities = command.images.map((imageUrl, index) =>
            imageRepo.create({
              scamReportId: saved.id,
              imageUrl,
              order: index,
            }),
          );
          await imageRepo.save(imageEntities);
        }

        return saved;
      },
    );

    // Reload with all relations and reaction counts for event
    const reportWithRelations = await this.scamReportRepository.findById(savedReport.id, [
      'images',
      'user',
      'user.userBadges',
      'user.userBadges.badge',
      'site',
      'admin',
      'reactions', // This will trigger reaction count calculation
    ]);

    if (!reportWithRelations) {
      return savedReport;
    }

    // Map report to response format (same as admin API response)
    const eventData = this.mapScamReportToResponse(reportWithRelations);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SCAM_REPORT_CREATED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish scam-report:created event',
            {
              error: error instanceof Error ? error.message : String(error),
              reportId: savedReport.id,
              userId: command.userId,
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
      like: report.likeCount || 0,
      dislike: report.dislikeCount || 0,
    };

    return {
      id: report.id,
      siteId: report.siteId || null,
      siteSlug: report.site?.slug || null,
      title: report.title || null,
      siteUrl: report.siteUrl,
      siteName: report.siteName || report.site?.name || null,
      siteAccountInfo: report.siteAccountInfo,
      registrationUrl: report.registrationUrl,
      contact: report.contact,
      userId: report.userId,
      userName: report.user?.displayName || null,
      userEmail: report.user?.email || null,
      userAvatarUrl: buildFullUrl(this.apiServiceUrl, report.user?.avatarUrl || null),
      userBadge: (() => {
        const activeBadge = report.user?.userBadges?.find(
          (ub: any) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl:
            buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) || null,
          iconName: activeBadge.badge.iconName || null,
          color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
          description: activeBadge.badge.description || null,
          obtain: activeBadge.badge.obtain || null,
        };
      })(),
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

import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { PointRewardService } from '../../../point/application/services/point-reward.service';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface ApproveScamReportCommand {
  reportId: string;
  adminId: string;
  title: string;
}

@Injectable()
export class ApproveScamReportUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    private readonly transactionService: TransactionService,
    private readonly pointRewardService: PointRewardService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: ApproveScamReportCommand): Promise<ScamReport> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw notFound(MessageKeys.SCAM_REPORT_NOT_FOUND);
    }

    if (report.status !== ScamReportStatus.PENDING) {
      throw badRequest(MessageKeys.SCAM_REPORT_ALREADY_PROCESSED);
    }

    const reviewedAt = new Date();
    const updatedReport = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reportRepo = manager.getRepository(ScamReport);
        await reportRepo.update(command.reportId, {
          title: command.title,
          status: ScamReportStatus.PUBLISHED,
          adminId: command.adminId,
          reviewedAt,
        });

        // Reward points only when admin approves the scam report
        await this.pointRewardService.rewardPoints(manager, {
          userId: report.userId,
          pointSettingKey: 'report_site_scam',
          category: 'report_site_scam',
          referenceType: 'scam_report',
          referenceId: command.reportId,
          description: '사이트 먹튀제보 보상 (Scam report reward)',
          descriptionKo: '사이트 먹튀제보 보상',
          metadata: {
            siteId: report.siteId || null,
            reportId: command.reportId,
            siteUrl: report.siteUrl,
            siteName: report.siteName,
          },
        });

        return { id: command.reportId };
      },
    );

    // Reload with all relations and reaction counts for event
    const reportWithRelations = await this.scamReportRepository.findById(
      updatedReport.id,
      [
        'images',
        'user',
        'user.userBadges',
        'user.userBadges.badge',
        'site',
        'admin',
        'reactions', // This will trigger reaction count calculation
      ],
    );

    if (!reportWithRelations) {
      const fallback = await this.scamReportRepository.findById(updatedReport.id);
      return fallback ?? report;
    }

    // Map report to response format (same as admin API response)
    const eventData = this.mapScamReportToResponse(reportWithRelations);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.SCAM_REPORT_APPROVED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish scam-report:approved event',
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

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';

export interface ApproveScamReportCommand {
  reportId: string;
  adminId: string;
}

@Injectable()
export class ApproveScamReportUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  async execute(command: ApproveScamReportCommand): Promise<ScamReport> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    if (report.status !== ScamReportStatus.PENDING) {
      throw new BadRequestException('Scam report has already been processed');
    }

    const updatedReport = await this.scamReportRepository.update(command.reportId, {
      status: ScamReportStatus.PUBLISHED,
      adminId: command.adminId,
      reviewedAt: new Date(),
    });

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
      return updatedReport;
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
          (ub: any) =>
            ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl:
            buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) || null,
            color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
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

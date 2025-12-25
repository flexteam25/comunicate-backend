import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { ListScamReportsUseCase } from '../../../application/handlers/list-scam-reports.use-case';
import { GetScamReportUseCase } from '../../../application/handlers/get-scam-report.use-case';
import { ApproveScamReportUseCase } from '../../../application/handlers/approve-scam-report.use-case';
import { RejectScamReportUseCase } from '../../../application/handlers/reject-scam-report.use-case';
import { ScamReportResponseDto } from '../dto/scam-report-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ScamReportStatus } from '../../../domain/entities/scam-report.entity';
import { ConfigService } from '@nestjs/config';

@Controller('admin/scam-reports')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminScamReportController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listScamReportsUseCase: ListScamReportsUseCase,
    private readonly getScamReportUseCase: GetScamReportUseCase,
    private readonly approveScamReportUseCase: ApproveScamReportUseCase,
    private readonly rejectScamReportUseCase: RejectScamReportUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapScamReportToResponse(report: any): ScamReportResponseDto {
    // Use reaction counts from database (counted via subquery)
    const reactions = {
      like: report.likeCount || 0,
      dislike: report.dislikeCount || 0,
    };

    return {
      id: report.id,
      siteId: report.siteId || null,
      siteUrl: report.siteUrl,
      siteName: report.siteName,
      siteAccountInfo: report.siteAccountInfo,
      registrationUrl: report.registrationUrl,
      contact: report.contact,
      userId: report.userId,
      userName: report.user?.displayName || null,
      userEmail: report.user?.email || null,
      title: report.title,
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

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.read')
  async listScamReports(
    @Query('status') status?: string,
    @Query('siteId') siteId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.listScamReportsUseCase.execute({
      siteId,
      status: status as ScamReportStatus | undefined,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((report) => this.mapScamReportToResponse(report)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.read')
  async getScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const report = await this.getScamReportUseCase.execute({
      reportId: id,
      isAdmin: true,
    });

    return ApiResponseUtil.success(this.mapScamReportToResponse(report));
  }

  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.moderate')
  async approveScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const report = await this.approveScamReportUseCase.execute({
      reportId: id,
      adminId: admin.adminId,
    });

    // Reload with relations
    const fullReport = await this.getScamReportUseCase.execute({
      reportId: id,
      isAdmin: true,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(fullReport),
      'Scam report approved successfully',
    );
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('scam-reports.moderate')
  async rejectScamReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<ScamReportResponseDto>> {
    const report = await this.rejectScamReportUseCase.execute({
      reportId: id,
      adminId: admin.adminId,
    });

    // Reload with relations
    const fullReport = await this.getScamReportUseCase.execute({
      reportId: id,
      isAdmin: true,
    });

    return ApiResponseUtil.success(
      this.mapScamReportToResponse(fullReport),
      'Scam report rejected successfully',
    );
  }
}

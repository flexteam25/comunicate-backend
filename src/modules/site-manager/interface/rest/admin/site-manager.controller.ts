import {
  Controller,
  Get,
  Post,
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
import { ListApplicationsUseCase } from '../../../application/handlers/admin/list-applications.use-case';
import { GetApplicationUseCase } from '../../../application/handlers/admin/get-application.use-case';
import { ApproveApplicationUseCase } from '../../../application/handlers/admin/approve-application.use-case';
import { RejectApplicationUseCase } from '../../../application/handlers/admin/reject-application.use-case';
import { ListApplicationsQueryDto } from '../dto/list-applications-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('admin/manager-applications')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSiteManagerController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listApplicationsUseCase: ListApplicationsUseCase,
    private readonly getApplicationUseCase: GetApplicationUseCase,
    private readonly approveApplicationUseCase: ApproveApplicationUseCase,
    private readonly rejectApplicationUseCase: RejectApplicationUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapApplicationToResponse(app: any): any {
    return {
      id: app.id,
      siteId: app.siteId,
      siteName: app.site?.name || null,
      userId: app.userId,
      userName: app.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, app.user?.avatarUrl || null) || null,
      message: app.message || null,
      status: app.status,
      adminId: app.adminId || null,
      adminName: app.admin?.displayName || null,
      reviewedAt: app.reviewedAt || null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  @Get()
  @RequirePermission('site.view')
  @HttpCode(HttpStatus.OK)
  async listApplications(
    @Query() query: ListApplicationsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listApplicationsUseCase.execute({
      siteName: query.siteName,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((app) => this.mapApplicationToResponse(app)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('site.view')
  @HttpCode(HttpStatus.OK)
  async getApplication(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const application = await this.getApplicationUseCase.execute({
      applicationId: id,
    });

    return ApiResponseUtil.success(this.mapApplicationToResponse(application));
  }

  @Post(':id/approve')
  @RequirePermission('site-manager-applications.approve')
  @HttpCode(HttpStatus.OK)
  async approveApplication(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const application = await this.approveApplicationUseCase.execute({
      applicationId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      this.mapApplicationToResponse(application),
      'Application approved successfully',
    );
  }

  @Put(':id/reject')
  @RequirePermission('site-manager-applications.approve')
  @HttpCode(HttpStatus.OK)
  async rejectApplication(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<any>> {
    const application = await this.rejectApplicationUseCase.execute({
      applicationId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      this.mapApplicationToResponse(application),
      'Application rejected successfully',
    );
  }
}

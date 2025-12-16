import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { CreateBadgeUseCase } from '../../../application/handlers/admin/create-badge.use-case';
import { UpdateBadgeUseCase } from '../../../application/handlers/admin/update-badge.use-case';
import { DeleteBadgeUseCase } from '../../../application/handlers/admin/delete-badge.use-case';
import { ListBadgesUseCase } from '../../../application/handlers/admin/list-badges.use-case';
import { GetBadgeUseCase } from '../../../application/handlers/admin/get-badge.use-case';
import { RestoreBadgeUseCase } from '../../../application/handlers/admin/restore-badge.use-case';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { Badge } from '../../../domain/entities/badge.entity';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { AdminBadgeResponse } from 'src/modules/site/interface/rest/dto/site-response.dto';

@Controller('admin/badges')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminBadgeController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createBadgeUseCase: CreateBadgeUseCase,
    private readonly updateBadgeUseCase: UpdateBadgeUseCase,
    private readonly deleteBadgeUseCase: DeleteBadgeUseCase,
    private readonly listBadgesUseCase: ListBadgesUseCase,
    private readonly getBadgeUseCase: GetBadgeUseCase,
    private readonly restoreBadgeUseCase: RestoreBadgeUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapBadgeToResponse(badge: Badge): AdminBadgeResponse {
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description || undefined,
      iconUrl: buildFullUrl(this.apiServiceUrl, badge.iconUrl || null) || undefined,
      badgeType: badge.badgeType,
      isActive: badge.isActive,
      createdAt: badge.createdAt,
      updatedAt: badge.updatedAt,
      deletedAt: badge.deletedAt || undefined,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('badge.create')
  @UseInterceptors(FileInterceptor('icon'))
  async createBadge(
    @Body() dto: CreateBadgeDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: MulterFile,
  ): Promise<ApiResponse<AdminBadgeResponse>> {
    let iconUrl: string | undefined;

    if (file) {
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'badges',
      });
      iconUrl = uploadResult.relativePath;
    }

    const badge = await this.createBadgeUseCase.execute({
      name: dto.name,
      description: dto.description,
      iconUrl: iconUrl || dto.iconUrl,
      badgeType: dto.badgeType,
      isActive: dto.isActive ?? true,
    });

    return ApiResponseUtil.success(
      this.mapBadgeToResponse(badge),
      'Badge created successfully',
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('badge.read')
  async listBadges(
    @Query('badgeType') badgeType?: string,
  ): Promise<ApiResponse<AdminBadgeResponse[]>> {
    const badges = await this.listBadgesUseCase.execute(badgeType);
    return ApiResponseUtil.success(badges.map((badge) => this.mapBadgeToResponse(badge)));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('badge.read')
  async getBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<AdminBadgeResponse>> {
    const badge = await this.getBadgeUseCase.execute({ badgeId: id });
    return ApiResponseUtil.success(this.mapBadgeToResponse(badge));
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('badge.update')
  @UseInterceptors(FileInterceptor('icon'))
  async updateBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBadgeDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: MulterFile,
  ): Promise<ApiResponse<AdminBadgeResponse>> {
    let iconUrl: string | undefined;

    if (file) {
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'badges',
      });
      iconUrl = uploadResult.relativePath;
    }

    const badge = await this.updateBadgeUseCase.execute({
      badgeId: id,
      name: dto.name,
      description: dto.description,
      iconUrl: iconUrl || dto.iconUrl,
      isActive: dto.isActive,
    });

    return ApiResponseUtil.success(
      this.mapBadgeToResponse(badge),
      'Badge updated successfully',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('badge.delete')
  async deleteBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    await this.deleteBadgeUseCase.execute({ badgeId: id });
    return ApiResponseUtil.success({ success: true }, 'Badge deleted successfully');
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('badge.update')
  async restoreBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    await this.restoreBadgeUseCase.execute({ badgeId: id });
    return ApiResponseUtil.success({ success: true }, 'Badge restored successfully');
  }
}

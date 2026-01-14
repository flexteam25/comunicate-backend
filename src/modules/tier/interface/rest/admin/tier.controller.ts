import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common/pipes';
import { CreateTierUseCase } from '../../../application/handlers/admin/create-tier.use-case';
import { UpdateTierUseCase } from '../../../application/handlers/admin/update-tier.use-case';
import { DeleteTierUseCase } from '../../../application/handlers/admin/delete-tier.use-case';
import { ListTiersUseCase } from '../../../application/handlers/admin/list-tiers.use-case';
import { ListTrashTiersUseCase } from '../../../application/handlers/admin/list-trash-tiers.use-case';
import { CreateTierDto } from '../dto/create-tier.dto';
import { UpdateTierDto } from '../dto/update-tier.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { Tier } from '../../../domain/entities/tier.entity';
import { RestoreTierUseCase } from '../../../application/handlers/admin/restore-tier.use-case';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('admin/tiers')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminTierController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createTierUseCase: CreateTierUseCase,
    private readonly updateTierUseCase: UpdateTierUseCase,
    private readonly deleteTierUseCase: DeleteTierUseCase,
    private readonly listTiersUseCase: ListTiersUseCase,
    private readonly restoreTierUseCase: RestoreTierUseCase,
    private readonly listTrashTiersUseCase: ListTrashTiersUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.update')
  @UseInterceptors(FileInterceptor('icon'))
  async createTier(
    @Body() dto: CreateTierDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: MulterFile,
  ): Promise<ApiResponse<Tier>> {
    let iconUrl: string | undefined;

    if (file) {
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'tiers',
      });
      iconUrl = uploadResult.relativePath;
    }

    const tier = await this.createTierUseCase.execute({
      ...dto,
      iconUrl: iconUrl || dto.iconUrl,
    });

    return ApiResponseUtil.success(
      this.mapTierToResponse(tier),
      MessageKeys.TIER_CREATED_SUCCESS,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listTiers(): Promise<ApiResponse<Tier[]>> {
    const tiers = await this.listTiersUseCase.execute();
    return ApiResponseUtil.success(tiers.map((tier) => this.mapTierToResponse(tier)));
  }

  @Get('trash')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listTrashTiers(): Promise<ApiResponse<Tier[]>> {
    const tiers = await this.listTrashTiersUseCase.execute();
    return ApiResponseUtil.success(tiers.map((tier) => this.mapTierToResponse(tier)));
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  @UseInterceptors(FileInterceptor('icon'))
  async updateTier(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTierDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: MulterFile,
  ): Promise<ApiResponse<Tier>> {
    let iconUrl: string | undefined;

    if (file) {
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'tiers',
      });
      iconUrl = uploadResult.relativePath;
    }

    const tier = await this.updateTierUseCase.execute({
      tierId: id,
      ...dto,
      iconUrl: iconUrl || dto.iconUrl,
    });

    return ApiResponseUtil.success(
      this.mapTierToResponse(tier),
      MessageKeys.TIER_UPDATED_SUCCESS,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.delete')
  async deleteTier(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteTierUseCase.execute({ tierId: id });
    return ApiResponseUtil.success(null, MessageKeys.TIER_DELETED_SUCCESS);
  }

  @Put('/restore/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async restoreTier(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.restoreTierUseCase.execute({ tierId: id });
    return ApiResponseUtil.success(null, MessageKeys.TIER_RESTORED_SUCCESS);
  }

  private mapTierToResponse(tier: Tier): any {
    return {
      id: tier.id,
      name: tier.name,
      description: tier.description || null,
      order: tier.order,
      iconUrl: buildFullUrl(this.apiServiceUrl, tier.iconUrl || null) || null,
      iconName: tier.iconName || null,
      isActive: tier.isActive,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt,
      deletedAt: tier.deletedAt || null,
    };
  }
}

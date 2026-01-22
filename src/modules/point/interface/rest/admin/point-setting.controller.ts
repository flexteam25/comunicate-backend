import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ListPointSettingsUseCase } from '../../../application/handlers/admin/list-point-settings.use-case';
import { UpdatePointSettingUseCase } from '../../../application/handlers/admin/update-point-setting.use-case';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { UpdatePointSettingDto } from '../dto/update-point-setting.dto';

@Controller('admin/point-settings')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminPointSettingController {
  constructor(
    private readonly listPointSettingsUseCase: ListPointSettingsUseCase,
    private readonly updatePointSettingUseCase: UpdatePointSettingUseCase,
  ) {}

  @Get()
  @RequirePermission('points.manage')
  @HttpCode(HttpStatus.OK)
  async listPointSettings(): Promise<ApiResponse<any>> {
    const settings = await this.listPointSettingsUseCase.execute();

    return ApiResponseUtil.success(
      settings.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        nameKo: s.nameKo,
        point: s.point,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    );
  }

  @Put(':id')
  @RequirePermission('points.manage')
  @HttpCode(HttpStatus.OK)
  async updatePointSetting(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePointSettingDto,
  ): Promise<ApiResponse<any>> {
    const setting = await this.updatePointSettingUseCase.execute({
      id,
      point: dto.point,
      name: dto.name,
      nameKo: dto.nameKo,
    });

    return ApiResponseUtil.success({
      id: setting.id,
      key: setting.key,
      name: setting.name,
      nameKo: setting.nameKo,
      point: setting.point,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    });
  }
}

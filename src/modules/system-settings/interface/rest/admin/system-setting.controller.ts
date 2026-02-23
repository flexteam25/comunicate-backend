import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { GetSystemSettingByKeyUseCase } from '../../../application/handlers/get-system-setting-by-key.use-case';
import { GetAllSystemSettingsUseCase } from '../../../application/handlers/get-all-system-settings.use-case';
import { UpdateSystemSettingValueUseCase } from '../../../application/handlers/admin/update-system-setting-value.use-case';
import { UpdateSystemSettingValueDto } from '../dto/update-system-setting-value.dto';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';

@Controller('admin/system-settings')
@UseGuards(AdminJwtAuthGuard)
export class SystemSettingAdminController {
  constructor(
    private readonly getSystemSettingByKeyUseCase: GetSystemSettingByKeyUseCase,
    private readonly getAllSystemSettingsUseCase: GetAllSystemSettingsUseCase,
    private readonly updateSystemSettingValueUseCase: UpdateSystemSettingValueUseCase,
  ) {}

  @Get()
  async getAll(
    @CurrentAdmin() _admin: CurrentAdminPayload,
  ): Promise<ApiResponse<Array<{ key: string; value: Record<string, unknown> | null }>>> {
    const settings = await this.getAllSystemSettingsUseCase.execute();
    const data = settings.map((s) => ({ key: s.key, value: s.value }));
    return ApiResponseUtil.success(data, MessageKeys.SYSTEM_SETTING_RETRIEVED_SUCCESS);
  }

  @Get(':key')
  async getByKey(
    @Param('key') key: string,
    @CurrentAdmin() _admin: CurrentAdminPayload,
  ): Promise<ApiResponse<{ key: string; value: Record<string, unknown> | null }>> {
    const setting = await this.getSystemSettingByKeyUseCase.execute({ key });
    return ApiResponseUtil.success(
      { key: setting.key, value: setting.value },
      MessageKeys.SYSTEM_SETTING_RETRIEVED_SUCCESS,
    );
  }

  @Patch(':key')
  async updateValue(
    @Param('key') key: string,
    @Body() dto: UpdateSystemSettingValueDto,
    @CurrentAdmin() _admin: CurrentAdminPayload,
  ): Promise<ApiResponse<{ key: string; value: Record<string, unknown> | null }>> {
    const updated = await this.updateSystemSettingValueUseCase.execute({
      key,
      value: dto.value,
    });
    return ApiResponseUtil.success(
      { key: updated.key, value: updated.value },
      MessageKeys.SYSTEM_SETTING_UPDATED_SUCCESS,
    );
  }
}

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
} from '@nestjs/common';
import { CreateTierUseCase } from '../../../application/handlers/admin/create-tier.use-case';
import { UpdateTierUseCase } from '../../../application/handlers/admin/update-tier.use-case';
import { DeleteTierUseCase } from '../../../application/handlers/admin/delete-tier.use-case';
import { ListTiersUseCase } from '../../../application/handlers/admin/list-tiers.use-case';
import { CreateTierDto } from '../dto/create-tier.dto';
import { UpdateTierDto } from '../dto/update-tier.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { Tier } from '../../../domain/entities/tier.entity';
import { RestoreTierUseCase } from '../../../application/handlers/admin/restore-tier.use-case';

@Controller('admin/tiers')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminTierController {
  constructor(
    private readonly createTierUseCase: CreateTierUseCase,
    private readonly updateTierUseCase: UpdateTierUseCase,
    private readonly deleteTierUseCase: DeleteTierUseCase,
    private readonly listTiersUseCase: ListTiersUseCase,
    private readonly restoreTierUseCase: RestoreTierUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.update')
  async createTier(@Body() dto: CreateTierDto): Promise<ApiResponse<Tier>> {
    const tier = await this.createTierUseCase.execute(dto);
    return ApiResponseUtil.success(tier, 'Tier created successfully');
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listTiers(): Promise<ApiResponse<Tier[]>> {
    const tiers = await this.listTiersUseCase.execute();
    return ApiResponseUtil.success(tiers);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async updateTier(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTierDto,
  ): Promise<ApiResponse<Tier>> {
    const tier = await this.updateTierUseCase.execute({ tierId: id, ...dto });
    return ApiResponseUtil.success(tier, 'Tier updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.delete')
  async deleteTier(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteTierUseCase.execute({ tierId: id });
    return ApiResponseUtil.success({ message: 'Tier deleted successfully' });
  }

  @Put('/restore/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async restoreTier(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.restoreTierUseCase.execute({ tierId: id });
    return ApiResponseUtil.success({ message: 'Tier restored successfully' });
  }
}

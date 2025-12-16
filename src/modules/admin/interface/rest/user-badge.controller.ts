import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../infrastructure/decorators/require-permission.decorator';
import { AssignBadgeUseCase } from '../../../user/application/handlers/admin/assign-badge.use-case';
import { RemoveBadgeUseCase } from '../../../user/application/handlers/admin/remove-badge.use-case';
import { AssignBadgeDto } from './dto/assign-badge.dto';
import { RemoveBadgeDto } from './dto/remove-badge.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { UserBadge } from '../../../user/domain/entities/user-badge.entity';

@Controller('admin/user-badges')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminUserBadgeController {
  constructor(
    private readonly assignBadgeUseCase: AssignBadgeUseCase,
    private readonly removeBadgeUseCase: RemoveBadgeUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('user.badge.assign')
  async assignBadge(@Body() dto: AssignBadgeDto): Promise<ApiResponse<UserBadge>> {
    const userBadge = await this.assignBadgeUseCase.execute({
      userId: dto.userId,
      badgeId: dto.badgeId,
    });
    return ApiResponseUtil.success(userBadge, 'Badge assigned successfully');
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('user.badge.remove')
  async removeBadge(@Body() dto: RemoveBadgeDto): Promise<ApiResponse<{ success: boolean }>> {
    await this.removeBadgeUseCase.execute({
      userId: dto.userId,
      badgeId: dto.badgeId,
    });
    return ApiResponseUtil.success({ success: true }, 'Badge removed successfully');
  }
}

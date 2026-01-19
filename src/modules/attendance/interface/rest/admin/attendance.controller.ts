import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { AdminListAttendancesUseCase } from '../../../application/handlers/admin/list-attendances.use-case';
import { AdminListAttendancesQueryDto } from '../dto/admin-list-attendances-query.dto';
import {
  AdminAttendanceResponse,
  AdminListAttendancesResponse,
} from '../dto/admin-attendance-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { Attendance } from '../../../domain/entities/attendance.entity';

@Controller('admin/attendances')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminAttendanceController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly adminListAttendancesUseCase: AdminListAttendancesUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Get()
  @RequirePermission('attendances.read')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listAttendances(
    @Query() query: AdminListAttendancesQueryDto,
  ): Promise<ApiResponse<AdminListAttendancesResponse>> {
    const result = await this.adminListAttendancesUseCase.execute({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      cursor: query.cursor,
      limit: query.limit || 20,
      search: query.search,
    });

    const mappedData: AdminAttendanceResponse[] = result.data.map((attendance) => ({
      id: attendance.id,
      userId: attendance.userId,
      displayName: attendance.user?.displayName || undefined,
      avatarUrl: attendance.user?.avatarUrl
        ? buildFullUrl(this.apiServiceUrl, attendance.user.avatarUrl)
        : undefined,
      message: attendance.message || undefined,
      attendanceDate: attendance.attendanceDate,
      attendanceTime: attendance.createdAt,
      currentStreak: (attendance as Attendance & { currentStreak?: number })
        .currentStreak,
      totalAttendanceDays: (attendance as Attendance & {
          totalAttendanceDays?: number;
        }).totalAttendanceDays,
    }));

    const response: AdminListAttendancesResponse = {
      data: mappedData,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };

    return ApiResponseUtil.success(response);
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../shared/decorators/current-user.decorator';
import { CreateAttendanceUseCase } from '../../application/handlers/create-attendance.use-case';
import { ListAttendancesUseCase } from '../../application/handlers/list-attendances.use-case';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import {
  AttendanceFilter,
  ListAttendancesQueryDto,
} from './dto/list-attendances-query.dto';
import {
  AttendanceResponse,
  ListAttendancesResponse,
} from './dto/attendance-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';

@Controller('api')
export class AttendanceController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createAttendanceUseCase: CreateAttendanceUseCase,
    private readonly listAttendancesUseCase: ListAttendancesUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Post('attendance')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAttendanceDto,
  ): Promise<ApiResponse<{ message: string; attendanceDate: string }>> {
    const attendance = await this.createAttendanceUseCase.execute({
      userId: user.userId,
      message: dto.message,
    });

    // Format date to YYYY-MM-DD
    const attendanceDate = attendance.attendanceDate.toISOString().split('T')[0];

    return ApiResponseUtil.success(
      {
        message: 'Attendance checked successfully',
        attendanceDate,
      },
      'Attendance checked successfully',
    );
  }

  @Get('attendances')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listAttendances(
    @Query() query: ListAttendancesQueryDto,
  ): Promise<ApiResponse<ListAttendancesResponse>> {
    const result = await this.listAttendancesUseCase.execute({
      filter: query.filter || AttendanceFilter.TODAY,
      cursor: query.cursor,
      limit: query.limit,
    });

    const mappedData: AttendanceResponse[] = result.data.map((item) => ({
      rankByTime: item.rankByTime,
      userId: item.userId,
      nickname: item.nickname,
      avatarUrl: item.avatarUrl
        ? buildFullUrl(this.apiServiceUrl, item.avatarUrl)
        : undefined,
      message: item.message,
      attendanceTime: item.attendanceTime,
      currentStreak: item.currentStreak,
      totalAttendanceDays: item.totalAttendanceDays,
    }));

    const response: ListAttendancesResponse = {
      ...(result.totalCount !== undefined ? { totalCount: result.totalCount } : {}),
      data: mappedData,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };

    return ApiResponseUtil.success(response);
  }
}

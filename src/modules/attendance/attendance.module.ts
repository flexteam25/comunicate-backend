import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './domain/entities/attendance.entity';
import { AttendanceStatistic } from './domain/entities/attendance-statistic.entity';
import { AttendanceRepository } from './infrastructure/persistence/typeorm/attendance.repository';
import { AttendanceStatisticRepository } from './infrastructure/persistence/typeorm/attendance-statistic.repository';
import { CreateAttendanceUseCase } from './application/handlers/create-attendance.use-case';
import { ListAttendancesUseCase } from './application/handlers/list-attendances.use-case';
import { CalculateAttendanceStatisticsUseCase } from './application/handlers/calculate-attendance-statistics.use-case';
import { AttendanceController } from './interface/rest/attendance.controller';
import { UserModule } from '../user/user.module';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, AttendanceStatistic]),
    UserModule, // To access IUserRepository
    UserTokenRepositoryModule,
  ],
  controllers: [AttendanceController],
  providers: [
    {
      provide: 'IAttendanceRepository',
      useClass: AttendanceRepository,
    },
    {
      provide: 'IAttendanceStatisticRepository',
      useClass: AttendanceStatisticRepository,
    },
    AttendanceRepository,
    AttendanceStatisticRepository,
    CreateAttendanceUseCase,
    ListAttendancesUseCase,
    CalculateAttendanceStatisticsUseCase,
  ],
  exports: [
    'IAttendanceRepository',
    'IAttendanceStatisticRepository',
    AttendanceRepository,
    AttendanceStatisticRepository,
    CalculateAttendanceStatisticsUseCase,
  ],
})
export class AttendanceModule {}

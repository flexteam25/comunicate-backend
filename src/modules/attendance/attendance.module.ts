import { Module } from '@nestjs/common';
import { AttendancePersistenceModule } from './attendance-persistence.module';
import { CreateAttendanceUseCase } from './application/handlers/create-attendance.use-case';
import { ListAttendancesUseCase } from './application/handlers/list-attendances.use-case';
import { CalculateAttendanceStatisticsUseCase } from './application/handlers/calculate-attendance-statistics.use-case';
import { AttendanceController } from './interface/rest/attendance.controller';
import { AdminAttendanceController } from './interface/rest/admin/attendance.controller';
import { AdminListAttendancesUseCase } from './application/handlers/admin/list-attendances.use-case';
import { UserModule } from '../user/user.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';

@Module({
  imports: [
    AttendancePersistenceModule,
    UserModule, // To access IUserRepository
    AuthPersistenceModule,
    AdminGuardsModule,
  ],
  controllers: [AttendanceController, AdminAttendanceController],
  providers: [
    CreateAttendanceUseCase,
    ListAttendancesUseCase,
    CalculateAttendanceStatisticsUseCase,
    AdminListAttendancesUseCase,
  ],
  exports: [AttendancePersistenceModule, CalculateAttendanceStatisticsUseCase],
})
export class AttendanceModule {}

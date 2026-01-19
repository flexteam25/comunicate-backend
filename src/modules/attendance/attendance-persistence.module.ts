import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './domain/entities/attendance.entity';
import { AttendanceStatistic } from './domain/entities/attendance-statistic.entity';
import { AttendanceRepository } from './infrastructure/persistence/typeorm/attendance.repository';
import { AttendanceStatisticRepository } from './infrastructure/persistence/typeorm/attendance-statistic.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, AttendanceStatistic])],
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
  ],
  exports: [
    'IAttendanceRepository',
    'IAttendanceStatisticRepository',
    AttendanceRepository,
    AttendanceStatisticRepository,
  ],
})
export class AttendancePersistenceModule {}

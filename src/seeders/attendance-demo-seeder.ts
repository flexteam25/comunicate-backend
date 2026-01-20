import { DataSource } from 'typeorm';
import { AttendanceStatistic } from '../modules/attendance/domain/entities/attendance-statistic.entity';
import { getTodayInKST } from '../shared/utils/attendance-date.util';

/**
 * Fix attendance_rank for today based on total and streak
 * Priority: total DESC, streak DESC, attendanceTime ASC (earlier = better)
 */
export class AttendanceDemoSeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('🔧 Starting to fix attendance_rank for today...');

      const today = getTodayInKST();
      const statisticRepo = queryRunner.manager.getRepository(AttendanceStatistic);

      // Get all statistics for today
      const todayStats = await statisticRepo.find({
        where: {
          statisticDate: today,
        },
        order: {
          totalAttendanceDays: 'DESC',
          currentStreak: 'DESC',
          attendanceTime: 'ASC',
        },
      });

      if (todayStats.length === 0) {
        console.log('⚠️  No statistics found for today. Nothing to fix.');
        await queryRunner.rollbackTransaction();
        return;
      }

      console.log(`📊 Found ${todayStats.length} statistics for today`);

      // Recalculate and update ranks
      let updatedCount = 0;
      for (let i = 0; i < todayStats.length; i++) {
        const stat = todayStats[i];
        const newRank = i + 1; // 1-based rank

        // Only update if rank changed
        if (stat.attendanceRank !== newRank) {
          await statisticRepo.update(stat.id, { attendanceRank: newRank });
          updatedCount++;
          console.log(
            `  ✓ Updated rank for user ${stat.userId}: ${stat.attendanceRank} → ${newRank} (total: ${stat.totalAttendanceDays}, streak: ${stat.currentStreak})`,
          );
        }
      }

      await queryRunner.commitTransaction();
      console.log('✅ Attendance rank fix completed successfully!');
      console.log(`📊 Total statistics checked: ${todayStats.length}`);
      console.log(`📊 Total ranks updated: ${updatedCount}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error fixing attendance rank:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}


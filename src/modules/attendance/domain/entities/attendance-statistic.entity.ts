import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../user/domain/entities/user.entity';

@Entity('attendance_statistics')
@Unique('unique_user_statistic_date', ['userId', 'statisticDate'])
@Index('IDX_attendance_statistics_user_id', ['userId'])
@Index('IDX_attendance_statistics_statistic_date', ['statisticDate'])
@Index('IDX_attendance_statistics_user_date', ['userId', 'statisticDate'])
@Index('IDX_attendance_statistics_date_rank', ['statisticDate', 'attendanceRank'])
export class AttendanceStatistic {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'statistic_date', type: 'date' })
  statisticDate: Date;

  @Column({ name: 'total_attendance_days', type: 'integer', default: 0 })
  totalAttendanceDays: number;

  @Column({ name: 'current_streak', type: 'integer', default: 0 })
  currentStreak: number;

  @Column({ name: 'attendance_time', type: 'timestamptz', nullable: true })
  attendanceTime?: Date;

  @Column({ name: 'attendance_rank', type: 'integer', nullable: true })
  attendanceRank?: number;

  @Column({ name: 'daily_message', type: 'varchar', length: 20, nullable: true })
  dailyMessage?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../../user/domain/entities/user.entity';

@Entity('attendances')
@Unique('unique_user_date', ['userId', 'attendanceDate'])
@Index('IDX_attendances_user_id', ['userId'])
@Index('IDX_attendances_attendance_date', ['attendanceDate'])
@Index('IDX_attendances_user_date', ['userId', 'attendanceDate'])
@Index('IDX_attendances_date_created', ['attendanceDate', 'createdAt'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'message', type: 'varchar', length: 20, nullable: true })
  message?: string;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

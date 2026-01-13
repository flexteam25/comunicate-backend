import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_ips')
@Unique(['userId', 'ip'])
@Index(['userId'])
@Index(['ip'])
@Index(['isBlocked'])
export class UserIp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'ip', type: 'varchar', length: 45 })
  ip: string;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}


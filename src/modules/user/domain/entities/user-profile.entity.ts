import {
  Entity,
  Column,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
  gender?: string;

  @Column({
    name: 'points',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: {
      from: (v: string | number | null) =>
        v == null ? 0 : Number(v),
      to: (v: number) => v,
    },
  })
  points: number;

  @Column({ name: 'register_ip', type: 'varchar', length: 45, nullable: true })
  registerIp?: string;

  @Column({ name: 'last_login_ip', type: 'varchar', length: 45, nullable: true })
  lastLoginIp?: string;

  @Column({ name: 'last_request_ip', type: 'varchar', length: 45, nullable: true })
  lastRequestIp?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => User, (user) => user.userProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

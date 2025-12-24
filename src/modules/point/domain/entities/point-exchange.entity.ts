import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../user/domain/entities/user.entity';
import { Site } from '../../../site/domain/entities/site.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';

/**
 * Enum defining point exchange status
 */
export enum PointExchangeStatus {
  PENDING = 'pending', // Waiting for processing
  PROCESSING = 'processing', // Being processed
  COMPLETED = 'completed', // Completed
  REJECTED = 'rejected', // Rejected (points refunded)
  CANCELLED = 'cancelled', // Cancelled
}

/**
 * Entity representing point exchange request to partner site currency
 */
@Entity('point_exchanges')
@Index('IDX_point_exchanges_user_id', ['userId'])
@Index('IDX_point_exchanges_site_id', ['siteId'])
@Index('IDX_point_exchanges_status', ['status'])
@Index('IDX_point_exchanges_created_at', ['createdAt'])
export class PointExchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ID of the user requesting exchange */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** ID of the partner site */
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  /** Points amount to exchange */
  @Column({ name: 'points_amount', type: 'integer' })
  pointsAmount: number;

  /** Site currency amount (KRW) - calculated based on exchange rate */
  @Column({
    name: 'site_currency_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  siteCurrencyAmount: number;

  /** Exchange rate (points : currency) - default 1 point = 1 KRW */
  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  exchangeRate?: number;

  /** User ID on partner site (for admin to transfer money to) */
  @Column({ name: 'site_user_id', type: 'varchar', length: 255 })
  siteUserId: string;

  /** Processing status: pending → processing → completed/rejected */
  @Column({
    type: 'enum',
    enum: PointExchangeStatus,
    default: PointExchangeStatus.PENDING,
  })
  status: PointExchangeStatus;

  /** ID of the admin who processed the request */
  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  /** Time when admin processed (approve/reject) */
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;

  /** Rejection reason (if status = rejected) */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Relationship with User */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Relationship with Site */
  @ManyToOne(() => Site, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'site_id' })
  site?: Site;

  /** Relationship with Admin (admin who processed) */
  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;
}

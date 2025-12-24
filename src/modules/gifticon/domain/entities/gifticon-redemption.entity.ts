import { Entity, Column, ManyToOne, JoinColumn, Index, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../../user/domain/entities/user.entity';
import { Gifticon } from './gifticon.entity';

/**
 * Enum defining gifticon redemption status
 */
export enum GifticonRedemptionStatus {
  PENDING = 'pending', // Waiting for admin approval
  COMPLETED = 'completed', // Approved, cannot rollback
  REJECTED = 'rejected', // Admin rejected, points not refunded
  CANCELLED = 'cancelled', // Cancelled by user, points not refunded
}

/**
 * Entity representing gifticon redemption request
 * Stores information about user redemptions using points
 */
@Entity('gifticon_redemptions')
@Index('IDX_gifticon_redemptions_user_id', ['userId'])
@Index('IDX_gifticon_redemptions_gifticon_id', ['gifticonId'])
@Index('IDX_gifticon_redemptions_status', ['status'])
@Index('IDX_gifticon_redemptions_redemption_code', ['redemptionCode'])
@Index('IDX_gifticon_redemptions_created_at', ['createdAt'])
export class GifticonRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ID of the user redeeming gifticon */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** ID of the gifticon being redeemed */
  @Column({ name: 'gifticon_id', type: 'uuid' })
  gifticonId: string;

  /** Points used for redemption */
  @Column({ name: 'points_used', type: 'integer' })
  pointsUsed: number;

  /**
   * Redemption status
   * - pending: User redeemed, waiting for admin approval
   * - completed: Admin approved, cannot rollback
   * - cancelled: Cancelled (user or admin cancel when pending)
   */
  @Column({
    type: 'enum',
    enum: GifticonRedemptionStatus,
    default: GifticonRedemptionStatus.PENDING,
  })
  status: GifticonRedemptionStatus;

  /** Redemption code for user to use gifticon (UUID format) */
  @Column({ name: 'redemption_code', type: 'varchar', length: 255, unique: true, nullable: true })
  redemptionCode?: string;

  /**
   * Gifticon information snapshot at redemption time
   * Stored to ensure data integrity if gifticon is edited later
   */
  @Column({ name: 'gifticon_snapshot', type: 'jsonb', nullable: true })
  gifticonSnapshot?: {
    title: string;
    amount: number;
    imageUrl?: string;
    summary?: string;
  };

  /** Time when redemption was cancelled */
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  /** ID of user or admin who cancelled */
  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string;

  /** Cancellation reason */
  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Relationship with User */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Relationship with Gifticon */
  @ManyToOne(() => Gifticon, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'gifticon_id' })
  gifticon?: Gifticon;
}

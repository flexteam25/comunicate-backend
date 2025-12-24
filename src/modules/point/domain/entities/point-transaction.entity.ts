import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../../user/domain/entities/user.entity';

/**
 * Enum defining point transaction types
 */
export enum PointTransactionType {
  EARN = 'earn', // Earn points
  SPEND = 'spend', // Spend points
  REFUND = 'refund', // Refund points
}

/**
 * Entity representing point transaction history
 * Stores all point transactions (earn, spend, refund)
 */
@Entity('point_transactions')
@Index('IDX_point_transactions_user_id', ['userId'])
@Index('IDX_point_transactions_created_at', ['createdAt'])
@Index('IDX_point_transactions_category', ['category'])
@Index('IDX_point_transactions_reference', ['referenceType', 'referenceId'])
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ID of the user who owns this transaction */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Transaction type: earn, spend, refund */
  @Column({
    type: 'enum',
    enum: PointTransactionType,
  })
  type: PointTransactionType;

  /**
   * Points amount in transaction
   * - Positive for earn and refund
   * - Negative for spend
   */
  @Column({ type: 'integer' })
  amount: number;

  /** Balance after this transaction */
  @Column({ name: 'balance_after', type: 'integer' })
  balanceAfter: number;

  /**
   * Transaction category
   * Examples: 'attendance', 'gifticon_redemption', 'point_exchange', 'admin_adjustment'
   */
  @Column({ type: 'varchar', length: 50 })
  category: string;

  /**
   * Reference object type
   * Examples: 'gifticon_redemption', 'point_exchange', 'attendance'
   */
  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string;

  /** ID of the reference object (gifticon_redemption_id, point_exchange_id, etc.) */
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;

  /** Transaction description (e.g., "Gifticon: Starbucks 10,000원") */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Additional information in JSON format (flexible data) */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Relationship with User */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

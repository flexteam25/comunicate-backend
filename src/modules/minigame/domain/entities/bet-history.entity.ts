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

/**
 * Bet history record from game callback.
 * - round_number: from callback (identifies the round)
 * - payout: rate from callback
 * - payout_amount: actual win amount (capped if over max payout)
 * - max_payout_deduct: amount deducted due to cap (0 if no cap)
 */
@Entity('bet_histories')
@Index('IDX_bet_histories_user_id', ['userId'])
@Index('IDX_bet_histories_game_type', ['gameType'])
@Index('IDX_bet_histories_round_number', ['roundNumber'])
@Index('IDX_bet_histories_tx_ref', ['txRef'])
@Index('IDX_bet_histories_created_at', ['createdAt'])
export class BetHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'game_type', type: 'varchar', length: 50 })
  gameType: string;

  /** From callback; null when bet has no round yet (updated on win/lose) */
  @Column({ name: 'round_number', type: 'varchar', length: 255, nullable: true })
  roundNumber: string | null;

  /** Idempotency / lookup from callback txRef */
  @Column({ name: 'tx_ref', type: 'varchar', length: 255, nullable: true })
  txRef: string | null;

  @Column({
    name: 'bet_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: {
      from: (v: string | number | null) => (v == null ? 0 : Number(v)),
      to: (v: number) => v,
    },
  })
  betAmount: number;

  @Column({ name: 'coin_type', type: 'varchar', length: 20, default: 'point' })
  coinType: string;

  /** Payout rate from callback */
  @Column({
    name: 'payout',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: {
      from: (v: string | number | null) => (v == null ? null : Number(v)),
      to: (v: number | null) => v,
    },
  })
  payout?: number | null;

  /** Actual win amount (capped if over max payout) */
  @Column({
    name: 'payout_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: {
      from: (v: string | number | null) => (v == null ? 0 : Number(v)),
      to: (v: number) => v,
    },
  })
  payoutAmount: number;

  /** Amount deducted due to max payout cap (0 if no cap) */
  @Column({
    name: 'max_payout_deduct',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: {
      from: (v: string | number | null) => (v == null ? 0 : Number(v)),
      to: (v: number) => v,
    },
  })
  maxPayoutDeduct: number;

  /** Round result from callback */
  @Column({ name: 'round_result', type: 'text', nullable: true })
  roundResult?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_daily_stats')
export class GameDailyStats {
  @PrimaryColumn({ type: 'date' })
  date: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'game_type', type: 'varchar' })
  gameType: string;

  @Column({ name: 'total_bet', type: 'numeric', default: 0 })
  totalBet: string;

  @Column({ name: 'total_win', type: 'numeric', default: 0 })
  totalWin: string;

  @Column({ name: 'total_deduct', type: 'numeric', default: 0 })
  totalDeduct: string;

  @Column({ name: 'net_win', type: 'numeric', default: 0 })
  netWin: string;

  @Column({ name: 'rounds_played', type: 'integer', default: 0 })
  roundsPlayed: number;

  @Column({ name: 'count_win', type: 'integer', default: 0 })
  countWin: number;

  @Column({ name: 'count_lose', type: 'integer', default: 0 })
  countLose: number;

  @Column({ name: 'count_draw', type: 'integer', default: 0 })
  countDraw: number;

  @Column({ name: 'total_cancel', type: 'numeric', default: 0 })
  totalCancel: string;

  @Column({ name: 'count_cancel', type: 'integer', default: 0 })
  countCancel: number;

  @Column({ name: 'max_single_win', type: 'numeric', default: 0 })
  maxSingleWin: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

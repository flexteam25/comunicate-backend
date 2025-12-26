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
import { Site } from '../../../site/domain/entities/site.entity';

export enum SiteReviewStatisticsType {
  DAILY = 'daily',
  TOTAL = 'total',
  TEMP = 'temp',
}

@Entity('site_review_statistics')
@Index('IDX_site_review_statistics_site_id', ['siteId'])
@Index('IDX_site_review_statistics_type', ['type'])
@Index('IDX_site_review_statistics_statistic_date', ['statisticDate'])
@Index('IDX_site_review_statistics_site_type_date', ['siteId', 'type', 'statisticDate'])
export class SiteReviewStatistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({
    type: 'enum',
    enum: SiteReviewStatisticsType,
  })
  type: SiteReviewStatisticsType;

  @Column({ name: 'statistic_date', type: 'date', nullable: true })
  statisticDate?: Date;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: number;

  @Column({
    name: 'average_odds',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  averageOdds: number;

  @Column({
    name: 'average_limit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  averageLimit: number;

  @Column({
    name: 'average_event',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  averageEvent: number;

  @Column({
    name: 'average_speed',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  averageSpeed: number;

  @Column({ name: 'like_count', type: 'integer', default: 0 })
  likeCount: number;

  @Column({ name: 'dislike_count', type: 'integer', default: 0 })
  dislikeCount: number;

  @Column({ name: 'comment_count', type: 'integer', default: 0 })
  commentCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;
}


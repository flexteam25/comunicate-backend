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
import { ScamReport } from './scam-report.entity';
import { User } from '../../../user/domain/entities/user.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

@Entity('scam_report_reactions')
@Unique('unique_scam_report_user_reaction', ['scamReportId', 'userId'])
@Index('IDX_scam_report_reactions_scam_report_id', ['scamReportId'])
export class ScamReportReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scam_report_id', type: 'uuid' })
  scamReportId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'reaction_type',
    type: 'varchar',
    length: 10,
  })
  reactionType: ReactionType;

  @ManyToOne(() => ScamReport, (report) => report.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scam_report_id' })
  scamReport: ScamReport;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

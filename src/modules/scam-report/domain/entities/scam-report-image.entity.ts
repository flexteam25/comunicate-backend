import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ScamReport } from './scam-report.entity';

@Entity('scam_report_images')
@Index('IDX_scam_report_images_scam_report_id', ['scamReportId'])
@Index('IDX_scam_report_images_order', ['scamReportId', 'order'])
export class ScamReportImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scam_report_id', type: 'uuid' })
  scamReportId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @ManyToOne(() => ScamReport, (report) => report.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scam_report_id' })
  scamReport: ScamReport;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

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
import { UserBadgeRequest } from './user-badge-request.entity';

@Entity('user_badge_request_images')
@Index('IDX_user_badge_request_images_request_id', ['requestId'])
export class UserBadgeRequestImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'integer', nullable: true })
  order?: number | null;

  @ManyToOne(() => UserBadgeRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: UserBadgeRequest;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

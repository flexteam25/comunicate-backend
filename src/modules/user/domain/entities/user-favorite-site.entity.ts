import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Site } from '../../../site/domain/entities/site.entity';

@Entity('user_favorite_sites')
export class UserFavoriteSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @ManyToOne(() => User, (user) => user.userFavoriteSites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;
}

import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { Site } from './site.entity';

@Entity('site_categories')
export class SiteCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Site, (site) => site.category)
  sites: Site[];
}

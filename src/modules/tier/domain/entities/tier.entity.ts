import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { Site } from '../../../site/domain/entities/site.entity';

@Entity('tiers')
export class Tier extends BaseEntity {
  @Column({ type: 'varchar', length: 10, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Site, (site) => site.tier)
  sites: Site[];
}


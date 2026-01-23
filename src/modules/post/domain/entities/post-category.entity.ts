import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { Post } from './post.entity';

@Entity('post_categories')
@Index('IDX_post_categories_name', ['name'])
export class PostCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ name: 'name_ko', type: 'varchar', length: 50, nullable: true })
  nameKo?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'show_main', type: 'boolean', default: false })
  showMain: boolean;

  @Column({ name: 'is_point_banner', type: 'boolean', default: false })
  isPointBanner: boolean;

  @Column({ name: 'order_in_main', type: 'integer', nullable: true })
  orderInMain?: number | null;

  @Column({ name: 'special_key', type: 'varchar', length: 50, nullable: true })
  specialKey?: string | null;

  @Column({ type: 'integer', nullable: true })
  order?: number | null;

  @Column({ name: 'admin_create_only', type: 'boolean', default: true })
  adminCreateOnly: boolean;

  @Column({ type: 'integer', default: 0 })
  point: number;

  @OneToMany(() => Post, (post) => post.category)
  posts: Post[];
}

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

  @Column({ name: 'special_key', type: 'varchar', length: 50, nullable: true })
  specialKey?: string | null;

  @Column({ type: 'integer', nullable: true })
  order?: number | null;

  @OneToMany(() => Post, (post) => post.category)
  posts: Post[];
}

import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';

@Entity('point_settings')
export class PointSetting extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'name_ko', type: 'varchar', length: 255 })
  nameKo: string;

  @Column({ type: 'integer' })
  point: number;
}

import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { UserPermission } from './user-permission.entity';

export enum PermissionType {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PermissionType.USER,
  })
  type: PermissionType;

  @OneToMany(() => UserPermission, (userPermission) => userPermission.permission)
  userPermissions: UserPermission[];
}

import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { UserRole } from './user-role.entity';

export enum RoleType {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: RoleType.USER,
  })
  type: RoleType;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}

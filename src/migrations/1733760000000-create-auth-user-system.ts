import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAuthUserSystem1733760000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create permissions table
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create badges table (used for both users and sites)
    await queryRunner.createTable(
      new Table({
        name: 'badges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'icon_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'badge_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'user'",
            comment: "Type: 'user' or 'site'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'avatar_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create user_tokens table for stateful JWT management
    await queryRunner.createTable(
      new Table({
        name: 'user_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
            comment: 'JWT jti (JWT ID) claim',
          },
          {
            name: 'refresh_token_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'device_info',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create user_roles table (many-to-many)
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create user_permissions table (many-to-many, for direct permission assignment)
    await queryRunner.createTable(
      new Table({
        name: 'user_permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'permission_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create user_badges table
    await queryRunner.createTable(
      new Table({
        name: 'user_badges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'badge_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'earned_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({ name: 'IDX_users_email', columnNames: ['email'] }),
    );
    await queryRunner.createIndex(
      'user_tokens',
      new TableIndex({
        name: 'IDX_user_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_tokens',
      new TableIndex({
        name: 'IDX_user_tokens_token_id',
        columnNames: ['token_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_role_id',
        columnNames: ['role_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_permissions',
      new TableIndex({
        name: 'IDX_user_permissions_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_permissions',
      new TableIndex({
        name: 'IDX_user_permissions_permission_id',
        columnNames: ['permission_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_badges',
      new TableIndex({
        name: 'IDX_user_badges_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_badges',
      new TableIndex({
        name: 'IDX_user_badges_badge_id',
        columnNames: ['badge_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_permissions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'permissions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_badges',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_badges',
      new TableForeignKey({
        columnNames: ['badge_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'badges',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const userTokensTable = await queryRunner.getTable('user_tokens');
    const userRolesTable = await queryRunner.getTable('user_roles');
    const userPermissionsTable = await queryRunner.getTable('user_permissions');
    const userBadgesTable = await queryRunner.getTable('user_badges');

    if (userTokensTable) {
      const fk = userTokensTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (fk) await queryRunner.dropForeignKey('user_tokens', fk);
    }

    if (userRolesTable) {
      const fk1 = userRolesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      const fk2 = userRolesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('role_id') !== -1,
      );
      if (fk1) await queryRunner.dropForeignKey('user_roles', fk1);
      if (fk2) await queryRunner.dropForeignKey('user_roles', fk2);
    }

    if (userPermissionsTable) {
      const fk1 = userPermissionsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      const fk2 = userPermissionsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('permission_id') !== -1,
      );
      if (fk1) await queryRunner.dropForeignKey('user_permissions', fk1);
      if (fk2) await queryRunner.dropForeignKey('user_permissions', fk2);
    }

    if (userBadgesTable) {
      const fk1 = userBadgesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      const fk2 = userBadgesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('badge_id') !== -1,
      );
      if (fk1) await queryRunner.dropForeignKey('user_badges', fk1);
      if (fk2) await queryRunner.dropForeignKey('user_badges', fk2);
    }

    // Drop tables
    await queryRunner.dropTable('user_badges', true);
    await queryRunner.dropTable('user_permissions', true);
    await queryRunner.dropTable('user_roles', true);
    await queryRunner.dropTable('user_tokens', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('badges', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('roles', true);
  }
}

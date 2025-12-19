import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateAdminSystem1765600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create admins table
    await queryRunner.createTable(
      new Table({
        name: "admins",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "email",
            type: "varchar",
            length: "255",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "password_hash",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "display_name",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "is_active",
            type: "boolean",
            isNullable: false,
            default: true,
          },
          {
            name: "last_login_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "deleted_at",
            type: "timestamptz",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create admin_roles table
    await queryRunner.createTable(
      new Table({
        name: "admin_roles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "admin_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "role_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create admin_permissions table
    await queryRunner.createTable(
      new Table({
        name: "admin_permissions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "admin_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "permission_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create admin_tokens table
    await queryRunner.createTable(
      new Table({
        name: "admin_tokens",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "admin_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "token_id",
            type: "varchar",
            length: "255",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "refresh_token_hash",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "device_info",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "ip_address",
            type: "varchar",
            length: "45",
            isNullable: true,
          },
          {
            name: "expires_at",
            type: "timestamptz",
            isNullable: false,
          },
          {
            name: "revoked_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create admin_old_passwords table
    await queryRunner.createTable(
      new Table({
        name: "admin_old_passwords",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "admin_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "password_hash",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "type",
            type: "varchar",
            length: "20",
            isNullable: false,
            default: "'change'",
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create foreign keys for admin_roles
    await queryRunner.createForeignKey(
      "admin_roles",
      new TableForeignKey({
        columnNames: ["admin_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "admins",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "admin_roles",
      new TableForeignKey({
        columnNames: ["role_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "roles",
        onDelete: "CASCADE",
      }),
    );

    // Create foreign keys for admin_permissions
    await queryRunner.createForeignKey(
      "admin_permissions",
      new TableForeignKey({
        columnNames: ["admin_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "admins",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "admin_permissions",
      new TableForeignKey({
        columnNames: ["permission_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "permissions",
        onDelete: "CASCADE",
      }),
    );

    // Create foreign keys for admin_tokens
    await queryRunner.createForeignKey(
      "admin_tokens",
      new TableForeignKey({
        columnNames: ["admin_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "admins",
        onDelete: "CASCADE",
      }),
    );

    // Create foreign keys for admin_old_passwords
    await queryRunner.createForeignKey(
      "admin_old_passwords",
      new TableForeignKey({
        columnNames: ["admin_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "admins",
        onDelete: "CASCADE",
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      "admin_roles",
      new TableIndex({
        name: "IDX_admin_roles_admin_id",
        columnNames: ["admin_id"],
      }),
    );

    await queryRunner.createIndex(
      "admin_permissions",
      new TableIndex({
        name: "IDX_admin_permissions_admin_id",
        columnNames: ["admin_id"],
      }),
    );

    await queryRunner.createIndex(
      "admin_tokens",
      new TableIndex({
        name: "IDX_admin_tokens_admin_id",
        columnNames: ["admin_id"],
      }),
    );

    await queryRunner.createIndex(
      "admin_old_passwords",
      new TableIndex({
        name: "IDX_admin_old_passwords_admin_id",
        columnNames: ["admin_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      "admin_old_passwords",
      "IDX_admin_old_passwords_admin_id",
    );
    await queryRunner.dropIndex("admin_tokens", "IDX_admin_tokens_admin_id");
    await queryRunner.dropIndex(
      "admin_permissions",
      "IDX_admin_permissions_admin_id",
    );
    await queryRunner.dropIndex("admin_roles", "IDX_admin_roles_admin_id");

    // Drop foreign keys
    const adminOldPasswordsTable = await queryRunner.getTable(
      "admin_old_passwords",
    );
    if (adminOldPasswordsTable) {
      const foreignKey = adminOldPasswordsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("admin_id") !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("admin_old_passwords", foreignKey);
      }
    }

    const adminTokensTable = await queryRunner.getTable("admin_tokens");
    if (adminTokensTable) {
      const foreignKey = adminTokensTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("admin_id") !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("admin_tokens", foreignKey);
      }
    }

    const adminPermissionsTable =
      await queryRunner.getTable("admin_permissions");
    if (adminPermissionsTable) {
      const foreignKeys = adminPermissionsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey("admin_permissions", fk);
      }
    }

    const adminRolesTable = await queryRunner.getTable("admin_roles");
    if (adminRolesTable) {
      const foreignKeys = adminRolesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey("admin_roles", fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable("admin_old_passwords");
    await queryRunner.dropTable("admin_tokens");
    await queryRunner.dropTable("admin_permissions");
    await queryRunner.dropTable("admin_roles");
    await queryRunner.dropTable("admins");
  }
}

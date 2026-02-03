import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates site_managers table (manager assignments per site).
 * Must run after CreateSiteSystemPart3 (sites, users exist) and before
 * AddConstraintsToSiteManagerApplications (which adds unique index on site_managers).
 * Fixes migration order so site_managers is not lost when running migrations from scratch.
 */
export class CreateSiteManagersTable1765665000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    const tableExists = await queryRunner.getTable('site_managers');
    if (tableExists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'site_managers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'manager'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'site_managers',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_managers',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'site_managers',
      new TableIndex({
        name: 'IDX_site_managers_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_managers',
      new TableIndex({
        name: 'IDX_site_managers_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('site_managers');
    if (!table) return;

    const fks = table.foreignKeys;
    for (const fk of fks) {
      await queryRunner.dropForeignKey('site_managers', fk);
    }
    await queryRunner.dropIndex('site_managers', 'IDX_site_managers_user_id');
    await queryRunner.dropIndex('site_managers', 'IDX_site_managers_site_id');
    await queryRunner.dropTable('site_managers');
  }
}

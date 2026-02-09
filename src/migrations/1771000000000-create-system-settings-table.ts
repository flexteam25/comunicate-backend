import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create system_settings table
 * - id: UUID PK
 * - key: unique setting key (e.g. maintenance)
 * - value: JSONB for flexible nested value
 * - created_at, updated_at
 */
export class CreateSystemSettingsTable1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    await queryRunner.createTable(
      new Table({
        name: 'system_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      ALTER TABLE "system_settings"
      ADD CONSTRAINT "UQ_system_settings_key"
      UNIQUE ("key")
    `);

    await queryRunner.createIndex(
      'system_settings',
      new TableIndex({
        name: 'IDX_system_settings_key',
        columnNames: ['key'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('system_settings', true);
  }
}

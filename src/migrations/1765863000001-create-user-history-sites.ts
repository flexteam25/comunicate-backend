import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserHistorySites1765863000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create user_history_sites table
    await queryRunner.createTable(
      new Table({
        name: 'user_history_sites',
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
            name: 'site_id',
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

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_history_sites',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_history_sites',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    // Indexes for fast lookups and rotation
    await queryRunner.createIndex(
      'user_history_sites',
      new TableIndex({
        name: 'IDX_user_history_sites_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_history_sites',
      new TableIndex({
        name: 'IDX_user_history_sites_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_history_sites',
      new TableIndex({
        name: 'IDX_user_history_sites_user_created_at',
        columnNames: ['user_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'user_history_sites',
      'IDX_user_history_sites_user_created_at',
    );
    await queryRunner.dropIndex('user_history_sites', 'IDX_user_history_sites_site_id');
    await queryRunner.dropIndex('user_history_sites', 'IDX_user_history_sites_user_id');

    // Drop foreign keys
    const historyTable = await queryRunner.getTable('user_history_sites');
    if (historyTable) {
      for (const fk of historyTable.foreignKeys) {
        await queryRunner.dropForeignKey('user_history_sites', fk);
      }
    }

    // Drop table
    await queryRunner.dropTable('user_history_sites');
  }
}

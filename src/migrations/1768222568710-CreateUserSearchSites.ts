import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserSearchSites1768222568710 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create user_search_sites table
    await queryRunner.createTable(
      new Table({
        name: 'user_search_sites',
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
            name: 'search_query',
            type: 'varchar',
            length: '255',
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

    // Create foreign key
    await queryRunner.createForeignKey(
      'user_search_sites',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Indexes for fast lookups and rotation
    await queryRunner.createIndex(
      'user_search_sites',
      new TableIndex({
        name: 'IDX_user_search_sites_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_search_sites',
      new TableIndex({
        name: 'IDX_user_search_sites_user_created_at',
        columnNames: ['user_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'user_search_sites',
      'IDX_user_search_sites_user_created_at',
    );
    await queryRunner.dropIndex('user_search_sites', 'IDX_user_search_sites_user_id');

    // Drop foreign keys
    const searchTable = await queryRunner.getTable('user_search_sites');
    if (searchTable) {
      for (const fk of searchTable.foreignKeys) {
        await queryRunner.dropForeignKey('user_search_sites', fk);
      }
    }

    // Drop table
    await queryRunner.dropTable('user_search_sites');
  }
}

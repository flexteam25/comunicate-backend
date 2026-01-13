import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSiteBadgeRequests1769100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    await queryRunner.createTable(
      new Table({
        name: 'site_badge_requests',
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
            name: 'badge_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'note',
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'site_badge_requests',
      new TableIndex({
        name: 'IDX_site_badge_requests_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_badge_requests',
      new TableIndex({
        name: 'IDX_site_badge_requests_badge_id',
        columnNames: ['badge_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_badge_requests',
      new TableIndex({
        name: 'IDX_site_badge_requests_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_badge_requests',
      new TableIndex({
        name: 'IDX_site_badge_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'site_badge_requests',
      new TableIndex({
        name: 'IDX_site_badge_requests_site_badge_status',
        columnNames: ['site_id', 'badge_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('site_badge_requests', 'IDX_site_badge_requests_site_badge_status');
    await queryRunner.dropIndex('site_badge_requests', 'IDX_site_badge_requests_status');
    await queryRunner.dropIndex('site_badge_requests', 'IDX_site_badge_requests_user_id');
    await queryRunner.dropIndex('site_badge_requests', 'IDX_site_badge_requests_badge_id');
    await queryRunner.dropIndex('site_badge_requests', 'IDX_site_badge_requests_site_id');
    await queryRunner.dropTable('site_badge_requests');
  }
}

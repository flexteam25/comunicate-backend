import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePocaEventsSystem1766389788887 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for poca_event_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE poca_event_status_enum AS ENUM ('draft', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create poca_events table
    await queryRunner.createTable(
      new Table({
        name: 'poca_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'summary',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'poca_event_status_enum',
            isNullable: false,
            default: "'draft'",
          },
          {
            name: 'starts_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'ends_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'primary_banner_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'view_count',
            type: 'integer',
            isNullable: false,
            default: 0,
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

    // Create indexes for poca_events
    await queryRunner.createIndex(
      'poca_events',
      new TableIndex({
        name: 'IDX_poca_events_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'poca_events',
      new TableIndex({
        name: 'IDX_poca_events_slug',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createIndex(
      'poca_events',
      new TableIndex({
        name: 'IDX_poca_events_starts_at',
        columnNames: ['starts_at'],
      }),
    );

    await queryRunner.createIndex(
      'poca_events',
      new TableIndex({
        name: 'IDX_poca_events_ends_at',
        columnNames: ['ends_at'],
      }),
    );

    // Create poca_event_banners table
    await queryRunner.createTable(
      new Table({
        name: 'poca_event_banners',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'event_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'order',
            type: 'integer',
            isNullable: false,
            default: 0,
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

    // Create foreign key for poca_event_banners
    await queryRunner.createForeignKey(
      'poca_event_banners',
      new TableForeignKey({
        columnNames: ['event_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'poca_events',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for poca_event_banners
    await queryRunner.createIndex(
      'poca_event_banners',
      new TableIndex({
        name: 'IDX_poca_event_banners_event_id',
        columnNames: ['event_id'],
      }),
    );

    await queryRunner.createIndex(
      'poca_event_banners',
      new TableIndex({
        name: 'IDX_poca_event_banners_event_order',
        columnNames: ['event_id', 'order'],
      }),
    );

    // Create poca_event_views table
    await queryRunner.createTable(
      new Table({
        name: 'poca_event_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'event_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '255',
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

    // Create foreign keys for poca_event_views
    await queryRunner.createForeignKey(
      'poca_event_views',
      new TableForeignKey({
        columnNames: ['event_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'poca_events',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'poca_event_views',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for poca_event_views
    await queryRunner.createIndex(
      'poca_event_views',
      new TableIndex({
        name: 'IDX_poca_event_views_event_id',
        columnNames: ['event_id'],
      }),
    );

    await queryRunner.createIndex(
      'poca_event_views',
      new TableIndex({
        name: 'IDX_poca_event_views_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'poca_event_views',
      'IDX_poca_event_views_user_id',
    );
    await queryRunner.dropIndex(
      'poca_event_views',
      'IDX_poca_event_views_event_id',
    );
    await queryRunner.dropIndex(
      'poca_event_banners',
      'IDX_poca_event_banners_event_order',
    );
    await queryRunner.dropIndex(
      'poca_event_banners',
      'IDX_poca_event_banners_event_id',
    );
    await queryRunner.dropIndex('poca_events', 'IDX_poca_events_ends_at');
    await queryRunner.dropIndex('poca_events', 'IDX_poca_events_starts_at');
    await queryRunner.dropIndex('poca_events', 'IDX_poca_events_slug');
    await queryRunner.dropIndex('poca_events', 'IDX_poca_events_status');

    // Drop tables (foreign keys will be dropped automatically)
    await queryRunner.dropTable('poca_event_views', true);
    await queryRunner.dropTable('poca_event_banners', true);
    await queryRunner.dropTable('poca_events', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS poca_event_status_enum;
    `);
  }
}

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGifticonsSystem1766394874941 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for gifticon_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gifticon_status_enum AS ENUM ('draft', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create gifticons table
    await queryRunner.createTable(
      new Table({
        name: 'gifticons',
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
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'gifticon_status_enum',
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

    // Create indexes for gifticons
    await queryRunner.createIndex(
      'gifticons',
      new TableIndex({
        name: 'IDX_gifticons_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'gifticons',
      new TableIndex({
        name: 'IDX_gifticons_slug',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createIndex(
      'gifticons',
      new TableIndex({
        name: 'IDX_gifticons_starts_at',
        columnNames: ['starts_at'],
      }),
    );

    await queryRunner.createIndex(
      'gifticons',
      new TableIndex({
        name: 'IDX_gifticons_ends_at',
        columnNames: ['ends_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('gifticons', 'IDX_gifticons_ends_at');
    await queryRunner.dropIndex('gifticons', 'IDX_gifticons_starts_at');
    await queryRunner.dropIndex('gifticons', 'IDX_gifticons_slug');
    await queryRunner.dropIndex('gifticons', 'IDX_gifticons_status');

    // Drop table
    await queryRunner.dropTable('gifticons', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS gifticon_status_enum;
    `);
  }
}

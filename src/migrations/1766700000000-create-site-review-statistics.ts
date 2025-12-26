import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateSiteReviewStatistics1766700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum for statistics type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE site_review_statistics_type_enum AS ENUM ('daily', 'total');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create site_review_statistics table
    await queryRunner.createTable(
      new Table({
        name: 'site_review_statistics',
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
            name: 'type',
            type: 'site_review_statistics_type_enum',
            isNullable: false,
          },
          {
            name: 'statistic_date',
            type: 'date',
            isNullable: true,
            comment: 'Date for daily statistics (NULL for total)',
          },
          {
            name: 'average_rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'average_odds',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'average_limit',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'average_event',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'average_speed',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'like_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'dislike_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'comment_count',
            type: 'integer',
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
        ],
      }),
      true,
    );

    // Create unique constraint: 1 site can only have 1 total statistics and 1 daily statistics per date
    await queryRunner.createUniqueConstraint(
      'site_review_statistics',
      new TableUnique({
        name: 'unique_site_type_date',
        columnNames: ['site_id', 'type', 'statistic_date'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'site_review_statistics',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'site_review_statistics',
      new TableIndex({
        name: 'IDX_site_review_statistics_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_review_statistics',
      new TableIndex({
        name: 'IDX_site_review_statistics_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'site_review_statistics',
      new TableIndex({
        name: 'IDX_site_review_statistics_statistic_date',
        columnNames: ['statistic_date'],
      }),
    );

    await queryRunner.createIndex(
      'site_review_statistics',
      new TableIndex({
        name: 'IDX_site_review_statistics_site_type_date',
        columnNames: ['site_id', 'type', 'statistic_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'site_review_statistics',
      'IDX_site_review_statistics_site_type_date',
    );
    await queryRunner.dropIndex(
      'site_review_statistics',
      'IDX_site_review_statistics_statistic_date',
    );
    await queryRunner.dropIndex('site_review_statistics', 'IDX_site_review_statistics_type');
    await queryRunner.dropIndex('site_review_statistics', 'IDX_site_review_statistics_site_id');
    await queryRunner.dropForeignKey(
      'site_review_statistics',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.dropUniqueConstraint(
      'site_review_statistics',
      'unique_site_type_date',
    );
    await queryRunner.dropTable('site_review_statistics', true);
    await queryRunner.query(`DROP TYPE IF EXISTS site_review_statistics_type_enum;`);
  }
}


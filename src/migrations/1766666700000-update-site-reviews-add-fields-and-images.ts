import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableColumn,
} from 'typeorm';

export class UpdateSiteReviewsAddFieldsAndImages1766666700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Drop title column from site_reviews
    await queryRunner.dropColumn('site_reviews', 'title');

    // Add new rating columns to site_reviews
    await queryRunner.addColumn(
      'site_reviews',
      new TableColumn({
        name: 'odds',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'site_reviews',
      new TableColumn({
        name: 'limit',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'site_reviews',
      new TableColumn({
        name: 'event',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'site_reviews',
      new TableColumn({
        name: 'speed',
        type: 'integer',
        isNullable: true,
      }),
    );

    // Create site_review_images table
    await queryRunner.createTable(
      new Table({
        name: 'site_review_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_review_id',
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
        ],
      }),
      true,
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'site_review_images',
      new TableForeignKey({
        columnNames: ['site_review_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_reviews',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      'site_review_images',
      new TableIndex({
        name: 'IDX_site_review_images_site_review_id',
        columnNames: ['site_review_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_review_images',
      new TableIndex({
        name: 'IDX_site_review_images_order',
        columnNames: ['site_review_id', 'order'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('site_review_images', 'IDX_site_review_images_order');
    await queryRunner.dropIndex(
      'site_review_images',
      'IDX_site_review_images_site_review_id',
    );

    // Drop foreign key
    const table = await queryRunner.getTable('site_review_images');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('site_review_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('site_review_images', foreignKey);
    }

    // Drop site_review_images table
    await queryRunner.dropTable('site_review_images');

    // Remove new columns
    await queryRunner.dropColumn('site_reviews', 'speed');
    await queryRunner.dropColumn('site_reviews', 'event');
    await queryRunner.dropColumn('site_reviews', 'limit');
    await queryRunner.dropColumn('site_reviews', 'odds');

    // Add back title column
    await queryRunner.addColumn(
      'site_reviews',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }
}

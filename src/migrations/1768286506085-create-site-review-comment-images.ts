import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSiteReviewCommentImages1768286506085 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create site_review_comment_images table
    await queryRunner.createTable(
      new Table({
        name: 'site_review_comment_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'comment_id',
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

    // Create indexes
    await queryRunner.createIndex(
      'site_review_comment_images',
      new TableIndex({
        name: 'IDX_site_review_comment_images_comment_id',
        columnNames: ['comment_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_review_comment_images',
      new TableIndex({
        name: 'IDX_site_review_comment_images_order',
        columnNames: ['comment_id', 'order'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'site_review_comment_images',
      new TableForeignKey({
        columnNames: ['comment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_review_comments',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('site_review_comment_images');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('comment_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('site_review_comment_images', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex(
      'site_review_comment_images',
      'IDX_site_review_comment_images_order',
    );
    await queryRunner.dropIndex(
      'site_review_comment_images',
      'IDX_site_review_comment_images_comment_id',
    );

    // Drop table
    await queryRunner.dropTable('site_review_comment_images', true);
  }
}

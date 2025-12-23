import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddThumbnailUrlToPosts1766400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('posts');
    const thumbnailUrlColumn = table?.findColumnByName('thumbnail_url');

    if (!thumbnailUrlColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'thumbnail_url',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('posts');
    const thumbnailUrlColumn = table?.findColumnByName('thumbnail_url');

    if (thumbnailUrlColumn) {
      await queryRunner.dropColumn('posts', 'thumbnail_url');
    }
  }
}

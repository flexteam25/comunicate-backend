import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsPointBannerToPostCategories1769200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'is_point_banner',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('post_categories', 'is_point_banner');
  }
}

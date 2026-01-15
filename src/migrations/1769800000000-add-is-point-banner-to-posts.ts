import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsPointBannerToPosts1769800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'is_point_banner',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('posts', 'is_point_banner');
  }
}

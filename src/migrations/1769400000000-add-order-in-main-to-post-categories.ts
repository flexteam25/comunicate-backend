import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderInMainToPostCategories1769400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'order_in_main',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('post_categories', 'order_in_main');
  }
}

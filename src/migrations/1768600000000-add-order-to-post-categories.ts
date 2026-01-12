import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderToPostCategories1768600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'order',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('post_categories', 'order');
  }
}

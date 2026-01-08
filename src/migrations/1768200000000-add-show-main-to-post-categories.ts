import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddShowMainToPostCategories1768200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'show_main',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('post_categories', 'show_main');
  }
}

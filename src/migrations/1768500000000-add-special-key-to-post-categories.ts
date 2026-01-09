import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSpecialKeyToPostCategories1768500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'special_key',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('post_categories', 'special_key');
  }
}

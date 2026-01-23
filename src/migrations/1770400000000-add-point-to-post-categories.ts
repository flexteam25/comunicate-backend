import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPointToPostCategories1770400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add point column with default 0
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'point',
        type: 'integer',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop point column
    await queryRunner.dropColumn('post_categories', 'point');
  }
}

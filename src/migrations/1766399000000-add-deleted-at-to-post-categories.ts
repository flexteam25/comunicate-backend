import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToPostCategories1766399000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('post_categories');
    const deletedAtColumn = table?.findColumnByName('deleted_at');

    if (!deletedAtColumn) {
      await queryRunner.addColumn(
        'post_categories',
        new TableColumn({
          name: 'deleted_at',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('post_categories');
    const deletedAtColumn = table?.findColumnByName('deleted_at');

    if (deletedAtColumn) {
      await queryRunner.dropColumn('post_categories', 'deleted_at');
    }
  }
}

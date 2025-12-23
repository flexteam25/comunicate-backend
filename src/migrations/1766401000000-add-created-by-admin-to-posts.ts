import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCreatedByAdminToPosts1766401000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('posts');
    const createdByAdminColumn = table?.findColumnByName('created_by_admin');

    if (!createdByAdminColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'created_by_admin',
          type: 'boolean',
          default: false,
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('posts');
    const createdByAdminColumn = table?.findColumnByName('created_by_admin');

    if (createdByAdminColumn) {
      await queryRunner.dropColumn('posts', 'created_by_admin');
    }
  }
}

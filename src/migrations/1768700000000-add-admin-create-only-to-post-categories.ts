import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdminCreateOnlyToPostCategories1768700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'post_categories',
      new TableColumn({
        name: 'admin_create_only',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('post_categories', 'admin_create_only');
  }
}

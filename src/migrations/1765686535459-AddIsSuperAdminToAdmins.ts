import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsSuperAdminToAdmins1765686535459 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add is_super_admin column to admins table
    await queryRunner.addColumn(
      'admins',
      new TableColumn({
        name: 'is_super_admin',
        type: 'boolean',
        isNullable: false,
        default: false,
        comment: 'Super admin bypasses all permission checks',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove is_super_admin column from admins table
    await queryRunner.dropColumn('admins', 'is_super_admin');
  }
}

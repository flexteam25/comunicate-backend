import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAvatarUrlToAdmins1765686535460 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add avatar_url column to admins table
    await queryRunner.addColumn(
      'admins',
      new TableColumn({
        name: 'avatar_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'Relative path to admin avatar image',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove avatar_url column from admins table
    await queryRunner.dropColumn('admins', 'avatar_url');
  }
}

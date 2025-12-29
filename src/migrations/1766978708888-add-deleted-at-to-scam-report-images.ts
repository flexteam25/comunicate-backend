import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToScamReportImages1766978708888 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add deleted_at column to scam_report_images
    await queryRunner.addColumn(
      'scam_report_images',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Remove deleted_at column
    await queryRunner.dropColumn('scam_report_images', 'deleted_at');
  }
}

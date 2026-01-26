import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCsMessengerToSiteRequests1770700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add cs_messenger column to site_requests table
    await queryRunner.addColumn(
      'site_requests',
      new TableColumn({
        name: 'cs_messenger',
        type: 'varchar',
        length: '255',
        isNullable: false,
        default: "''",
        comment: 'Customer service messenger contact information',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove cs_messenger column from site_requests table
    await queryRunner.dropColumn('site_requests', 'cs_messenger');
  }
}

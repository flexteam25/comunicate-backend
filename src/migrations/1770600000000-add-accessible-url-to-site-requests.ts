import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddAccessibleUrlToSiteRequests1770600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add accessible_url column to site_requests table
    await queryRunner.addColumn(
      'site_requests',
      new TableColumn({
        name: 'accessible_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'Accessible URL of the site',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove accessible_url column from site_requests table
    await queryRunner.dropColumn('site_requests', 'accessible_url');
  }
}

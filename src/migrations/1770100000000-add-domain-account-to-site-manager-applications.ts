import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDomainAccountToSiteManagerApplications1770100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    const table = await queryRunner.getTable('site_manager_applications');

    if (table) {
      // Check if domain column exists
      const domainColumn = table.findColumnByName('domain');
      if (!domainColumn) {
        await queryRunner.addColumn(
          'site_manager_applications',
          new TableColumn({
            name: 'domain',
            type: 'varchar',
            length: '255',
            isNullable: true, // Initially nullable for existing data
          }),
        );
      }

      // Check if account_id column exists
      const accountIdColumn = table.findColumnByName('account_id');
      if (!accountIdColumn) {
        await queryRunner.addColumn(
          'site_manager_applications',
          new TableColumn({
            name: 'account_id',
            type: 'varchar',
            length: '255',
            isNullable: true, // Initially nullable for existing data
          }),
        );
      }

      // Check if account_password column exists
      const accountPasswordColumn = table.findColumnByName('account_password');
      if (!accountPasswordColumn) {
        await queryRunner.addColumn(
          'site_manager_applications',
          new TableColumn({
            name: 'account_password',
            type: 'varchar',
            length: '255',
            isNullable: true, // Initially nullable for existing data
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('site_manager_applications');

    if (table) {
      // Remove domain column
      const domainColumn = table.findColumnByName('domain');
      if (domainColumn) {
        await queryRunner.dropColumn('site_manager_applications', 'domain');
      }

      // Remove account_id column
      const accountIdColumn = table.findColumnByName('account_id');
      if (accountIdColumn) {
        await queryRunner.dropColumn('site_manager_applications', 'account_id');
      }

      // Remove account_password column
      const accountPasswordColumn = table.findColumnByName('account_password');
      if (accountPasswordColumn) {
        await queryRunner.dropColumn(
          'site_manager_applications',
          'account_password',
        );
      }
    }
  }
}

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFieldsToScamReports1766646400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add site_url column
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'site_url',
        type: 'varchar',
        length: '500',
        isNullable: false,
        default: "''",
      }),
    );

    // Add site_name column
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'site_name',
        type: 'varchar',
        length: '255',
        isNullable: false,
        default: "''",
      }),
    );

    // Add site_account_info column
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'site_account_info',
        type: 'text',
        isNullable: false,
        default: "''",
      }),
    );

    // Add registration_url column
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'registration_url',
        type: 'varchar',
        length: '500',
        isNullable: false,
        default: "''",
      }),
    );

    // Add contact column
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'contact',
        type: 'varchar',
        length: '255',
        isNullable: false,
        default: "''",
      }),
    );

    // Remove default values after adding columns
    await queryRunner.query(`
      ALTER TABLE scam_reports
      ALTER COLUMN site_url DROP DEFAULT,
      ALTER COLUMN site_name DROP DEFAULT,
      ALTER COLUMN site_account_info DROP DEFAULT,
      ALTER COLUMN registration_url DROP DEFAULT,
      ALTER COLUMN contact DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove contact column
    await queryRunner.dropColumn('scam_reports', 'contact');

    // Remove registration_url column
    await queryRunner.dropColumn('scam_reports', 'registration_url');

    // Remove site_account_info column
    await queryRunner.dropColumn('scam_reports', 'site_account_info');

    // Remove site_name column
    await queryRunner.dropColumn('scam_reports', 'site_name');

    // Remove site_url column
    await queryRunner.dropColumn('scam_reports', 'site_url');
  }
}


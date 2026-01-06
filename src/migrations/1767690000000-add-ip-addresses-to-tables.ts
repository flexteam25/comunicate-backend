import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add IP address columns to tables for security and audit purposes
 * - user_profiles: register_ip, last_login_ip, last_request_ip
 * - scam_reports: ip_address (when user creates report)
 * - inquiries: ip_address (when user creates inquiry)
 * - point_exchanges: ip_address (when user requests exchange)
 * - gifticon_redemptions: ip_address (when user redeems gifticon)
 */
export class AddIpAddressesToTables1767690000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add IP columns to user_profiles
    await queryRunner.addColumn(
      'user_profiles',
      new TableColumn({
        name: 'register_ip',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address when user registered',
      }),
    );

    await queryRunner.addColumn(
      'user_profiles',
      new TableColumn({
        name: 'last_login_ip',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address of last login',
      }),
    );

    await queryRunner.addColumn(
      'user_profiles',
      new TableColumn({
        name: 'last_request_ip',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address of last API request',
      }),
    );

    // Add IP column to scam_reports
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'ip_address',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address when user created the report',
      }),
    );

    // Add IP column to inquiries
    await queryRunner.addColumn(
      'inquiries',
      new TableColumn({
        name: 'ip_address',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address when user created the inquiry',
      }),
    );

    // Add IP column to point_exchanges
    await queryRunner.addColumn(
      'point_exchanges',
      new TableColumn({
        name: 'ip_address',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address when user requested the exchange',
      }),
    );

    // Add IP column to gifticon_redemptions
    await queryRunner.addColumn(
      'gifticon_redemptions',
      new TableColumn({
        name: 'ip_address',
        type: 'varchar',
        length: '45',
        isNullable: true,
        comment: 'IP address when user redeemed the gifticon',
      }),
    );

    // Create indexes for IP columns (optional, for audit queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_profiles_register_ip" ON "user_profiles" ("register_ip");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_profiles_last_login_ip" ON "user_profiles" ("last_login_ip");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scam_reports_ip_address" ON "scam_reports" ("ip_address");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inquiries_ip_address" ON "inquiries" ("ip_address");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inquiries_ip_address";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_scam_reports_ip_address";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_profiles_last_login_ip";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_profiles_register_ip";
    `);

    // Drop columns
    await queryRunner.dropColumn('gifticon_redemptions', 'ip_address');
    await queryRunner.dropColumn('point_exchanges', 'ip_address');
    await queryRunner.dropColumn('inquiries', 'ip_address');
    await queryRunner.dropColumn('scam_reports', 'ip_address');
    await queryRunner.dropColumn('user_profiles', 'last_request_ip');
    await queryRunner.dropColumn('user_profiles', 'last_login_ip');
    await queryRunner.dropColumn('user_profiles', 'register_ip');
  }
}

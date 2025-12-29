import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddUserAdminToSiteEvents1766700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add user_id column
    await queryRunner.addColumn(
      'site_events',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add admin_id column
    await queryRunner.addColumn(
      'site_events',
      new TableColumn({
        name: 'admin_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create foreign key for user_id
    await queryRunner.createForeignKey(
      'site_events',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for admin_id
    await queryRunner.createForeignKey(
      'site_events',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for user_id and admin_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_site_events_user_id" ON "site_events" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_site_events_admin_id" ON "site_events" ("admin_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get the table
    const table = await queryRunner.getTable('site_events');
    if (!table) {
      throw new Error('site_events table does not exist');
    }

    // Find and drop foreign keys
    const userFk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (userFk) {
      await queryRunner.dropForeignKey('site_events', userFk);
    }

    const adminFk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('admin_id') !== -1,
    );
    if (adminFk) {
      await queryRunner.dropForeignKey('site_events', adminFk);
    }

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_site_events_user_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_site_events_admin_id";
    `);

    // Drop columns
    await queryRunner.dropColumn('site_events', 'user_id');
    await queryRunner.dropColumn('site_events', 'admin_id');
  }
}

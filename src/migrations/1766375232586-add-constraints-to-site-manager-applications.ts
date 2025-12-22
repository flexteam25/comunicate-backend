import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddConstraintsToSiteManagerApplications1766375232586
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add partial unique index: UNIQUE(site_id, user_id) WHERE status = 'pending'
    // This ensures only one pending application per user per site
    // But allows multiple applications with different statuses
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_manager_applications_unique_pending"
      ON "site_manager_applications" ("site_id", "user_id")
      WHERE "status" = 'pending';
    `);

    // Add index on status for faster filtering
    await queryRunner.createIndex(
      'site_manager_applications',
      new TableIndex({
        name: 'IDX_site_manager_applications_status',
        columnNames: ['status'],
      }),
    );

    // Add composite index on (site_id, status) for efficient queries
    await queryRunner.createIndex(
      'site_manager_applications',
      new TableIndex({
        name: 'IDX_site_manager_applications_site_status',
        columnNames: ['site_id', 'status'],
      }),
    );

    // Check if site_managers table exists and add unique constraint if not exists
    // Using raw query to check and create unique constraint safely
    const siteManagersTable = await queryRunner.getTable('site_managers');
    if (siteManagersTable) {
      const existingUniqueConstraint = siteManagersTable.indices.find(
        (index) =>
          index.isUnique &&
          index.columnNames.length === 2 &&
          index.columnNames.includes('site_id') &&
          index.columnNames.includes('user_id'),
      );

      if (!existingUniqueConstraint) {
        // Add unique constraint on (site_id, user_id) for site_managers
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_managers_unique_site_user"
          ON "site_managers" ("site_id", "user_id");
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partial unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_site_manager_applications_unique_pending";
    `);

    // Drop indexes
    await queryRunner.dropIndex(
      'site_manager_applications',
      'IDX_site_manager_applications_status',
    );
    await queryRunner.dropIndex(
      'site_manager_applications',
      'IDX_site_manager_applications_site_status',
    );

    // Drop unique constraint on site_managers if exists
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_site_managers_unique_site_user";
    `);
  }
}


import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class DropScamReportSiteTable1766051045757 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const table = await queryRunner.getTable('scam_report_site');
    if (!table) {
      return; // Table doesn't exist, nothing to do
    }

    // Drop indexes (including unique constraint if exists)
    const indexes = table.indices;
    for (const index of indexes) {
      try {
        await queryRunner.dropIndex('scam_report_site', index);
      } catch {
        // Index might not exist, continue silently
      }
    }

    // Drop foreign keys
    const foreignKeys = table.foreignKeys;
    for (const fk of foreignKeys) {
      try {
        await queryRunner.dropForeignKey('scam_report_site', fk);
      } catch {
        // Foreign key might not exist, continue silently
      }
    }

    // Drop table
    await queryRunner.dropTable('scam_report_site');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate table if needed (for rollback)
    await queryRunner.createTable(
      new Table({
        name: 'scam_report_site',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'scam_report_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Recreate foreign keys
    await queryRunner.query(`
      ALTER TABLE "scam_report_site"
      ADD CONSTRAINT "FK_scam_report_site_scam_report_id"
      FOREIGN KEY ("scam_report_id") REFERENCES "scam_reports"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "scam_report_site"
      ADD CONSTRAINT "FK_scam_report_site_site_id"
      FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE
    `);

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_scam_report_site_scam_report_id" ON "scam_report_site" ("scam_report_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_scam_report_site_unique" ON "scam_report_site" ("scam_report_id", "site_id")
    `);
  }
}

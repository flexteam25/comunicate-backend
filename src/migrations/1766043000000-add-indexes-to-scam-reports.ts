import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from 'typeorm';

export class AddIndexesToScamReports1766043000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('scam_reports');
    if (!table) {
      throw new Error('scam_reports table does not exist');
    }

    // Check if foreign key for site_id already exists
    const siteFkExists = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('site_id') !== -1,
    );

    // Add foreign key for site_id if it doesn't exist
    if (!siteFkExists) {
      await queryRunner.createForeignKey(
        'scam_reports',
        new TableForeignKey({
          columnNames: ['site_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'sites',
          onDelete: 'SET NULL',
        }),
      );
    }

    // Check if foreign key for admin_id already exists
    const adminFkExists = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('admin_id') !== -1,
    );

    // Add foreign key for admin_id if it doesn't exist
    if (!adminFkExists) {
      await queryRunner.createForeignKey(
        'scam_reports',
        new TableForeignKey({
          columnNames: ['admin_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'admins',
          onDelete: 'SET NULL',
        }),
      );
    }

    // Check if indexes already exist before creating
    const existingIndexes = table.indices.map((idx) => idx.name);

    // Add index for site_id if it doesn't exist
    if (!existingIndexes.includes('IDX_scam_reports_site_id')) {
      await queryRunner.createIndex(
        'scam_reports',
        new TableIndex({
          name: 'IDX_scam_reports_site_id',
          columnNames: ['site_id'],
        }),
      );
    }

    // Add index for status if it doesn't exist
    if (!existingIndexes.includes('IDX_scam_reports_status')) {
      await queryRunner.createIndex(
        'scam_reports',
        new TableIndex({
          name: 'IDX_scam_reports_status',
          columnNames: ['status'],
        }),
      );
    }

    // Add composite index for site_id and status if it doesn't exist
    if (!existingIndexes.includes('IDX_scam_reports_site_status')) {
      await queryRunner.createIndex(
        'scam_reports',
        new TableIndex({
          name: 'IDX_scam_reports_site_status',
          columnNames: ['site_id', 'status'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    const table = await queryRunner.getTable('scam_reports');
    if (table) {
      const existingIndexes = table.indices.map((idx) => idx.name);

      if (existingIndexes.includes('IDX_scam_reports_site_status')) {
        await queryRunner.dropIndex('scam_reports', 'IDX_scam_reports_site_status');
      }
      if (existingIndexes.includes('IDX_scam_reports_status')) {
        await queryRunner.dropIndex('scam_reports', 'IDX_scam_reports_status');
      }
      if (existingIndexes.includes('IDX_scam_reports_site_id')) {
        await queryRunner.dropIndex('scam_reports', 'IDX_scam_reports_site_id');
      }

      // Drop foreign keys
      const adminFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('admin_id') !== -1,
      );
      const siteFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('site_id') !== -1,
      );

      if (adminFk) {
        await queryRunner.dropForeignKey('scam_reports', adminFk);
      }
      if (siteFk) {
        await queryRunner.dropForeignKey('scam_reports', siteFk);
      }
    }
  }
}

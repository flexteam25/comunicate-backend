import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSiteSystemPart11765640000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create site_categories table
    await queryRunner.createTable(
      new Table({
        name: 'site_categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create tiers table
    await queryRunner.createTable(
      new Table({
        name: 'tiers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '10',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create sites table
    await queryRunner.createTable(
      new Table({
        name: 'sites',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'main_image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'tier_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'permanent_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'unverified'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'review_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'average_rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create site_managers table
    await queryRunner.createTable(
      new Table({
        name: 'site_managers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'manager'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create site_domains table
    await queryRunner.createTable(
      new Table({
        name: 'site_domains',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'domain',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'is_current',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create site_badges table
    await queryRunner.createTable(
      new Table({
        name: 'site_badges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'badge_id',
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

    // Create site_rank_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'site_rank_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'review_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'experience_years',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'total_views',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'total_favorites',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys for sites
    await queryRunner.createForeignKey(
      'sites',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_categories',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sites',
      new TableForeignKey({
        columnNames: ['tier_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tiers',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for site_managers
    await queryRunner.createForeignKey(
      'site_managers',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_managers',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_domains
    await queryRunner.createForeignKey(
      'site_domains',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_badges
    await queryRunner.createForeignKey(
      'site_badges',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_badges',
      new TableForeignKey({
        columnNames: ['badge_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'badges',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_rank_metrics
    await queryRunner.createForeignKey(
      'site_rank_metrics',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_category_id',
        columnNames: ['category_id'],
      }),
    );

    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_tier_id',
        columnNames: ['tier_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_managers',
      new TableIndex({
        name: 'IDX_site_managers_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_managers',
      new TableIndex({
        name: 'IDX_site_managers_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create unique constraint for site_managers
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_site_managers_unique" 
      ON "site_managers" ("site_id", "user_id")
    `);

    await queryRunner.createIndex(
      'site_domains',
      new TableIndex({
        name: 'IDX_site_domains_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_badges',
      new TableIndex({
        name: 'IDX_site_badges_site_id',
        columnNames: ['site_id'],
      }),
    );

    // Create unique constraint for site_badges
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_site_badges_unique" 
      ON "site_badges" ("site_id", "badge_id")
    `);

    // Update foreign keys for user_favorite_sites and scam_reports
    await queryRunner.createForeignKey(
      'user_favorite_sites',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    // Update foreign keys for scam_reports
    const scamReportsTable = await queryRunner.getTable('scam_reports');
    if (scamReportsTable) {
      await queryRunner.createForeignKey(
        'scam_reports',
        new TableForeignKey({
          columnNames: ['site_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'sites',
          onDelete: 'SET NULL',
        }),
      );

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

    // Update foreign keys for scam_report_site
    await queryRunner.createForeignKey(
      'scam_report_site',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys from scam_report_site
    const scamReportSiteTable = await queryRunner.getTable('scam_report_site');
    if (scamReportSiteTable) {
      const foreignKey = scamReportSiteTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('site_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('scam_report_site', foreignKey);
      }
    }

    // Drop foreign keys from scam_reports
    const scamReportsTable = await queryRunner.getTable('scam_reports');
    if (scamReportsTable) {
      const foreignKeys = scamReportsTable.foreignKeys.filter(
        (fk) => fk.columnNames.indexOf('site_id') !== -1 || fk.columnNames.indexOf('admin_id') !== -1,
      );
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('scam_reports', fk);
      }
    }

    // Drop foreign keys from user_favorite_sites
    const userFavoriteSitesTable = await queryRunner.getTable('user_favorite_sites');
    if (userFavoriteSitesTable) {
      const foreignKey = userFavoriteSitesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('site_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_favorite_sites', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_site_badges_unique"');
    await queryRunner.dropIndex('site_badges', 'IDX_site_badges_site_id');
    await queryRunner.dropIndex('site_domains', 'IDX_site_domains_site_id');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_site_managers_unique"');
    await queryRunner.dropIndex('site_managers', 'IDX_site_managers_user_id');
    await queryRunner.dropIndex('site_managers', 'IDX_site_managers_site_id');
    await queryRunner.dropIndex('sites', 'IDX_sites_tier_id');
    await queryRunner.dropIndex('sites', 'IDX_sites_category_id');

    // Drop foreign keys
    const siteRankMetricsTable = await queryRunner.getTable('site_rank_metrics');
    if (siteRankMetricsTable) {
      const foreignKey = siteRankMetricsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('site_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('site_rank_metrics', foreignKey);
      }
    }

    const siteBadgesTable = await queryRunner.getTable('site_badges');
    if (siteBadgesTable) {
      const foreignKeys = siteBadgesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_badges', fk);
      }
    }

    const siteDomainsTable = await queryRunner.getTable('site_domains');
    if (siteDomainsTable) {
      const foreignKey = siteDomainsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('site_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('site_domains', foreignKey);
      }
    }

    const siteManagersTable = await queryRunner.getTable('site_managers');
    if (siteManagersTable) {
      const foreignKeys = siteManagersTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_managers', fk);
      }
    }

    const sitesTable = await queryRunner.getTable('sites');
    if (sitesTable) {
      const foreignKeys = sitesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('sites', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('site_rank_metrics');
    await queryRunner.dropTable('site_badges');
    await queryRunner.dropTable('site_domains');
    await queryRunner.dropTable('site_managers');
    await queryRunner.dropTable('sites');
    await queryRunner.dropTable('tiers');
    await queryRunner.dropTable('site_categories');
  }
}


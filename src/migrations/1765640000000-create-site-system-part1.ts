import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSiteSystemPart11765640000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for site_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE site_status_enum AS ENUM ('unverified', 'verified', 'monitored');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

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
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
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
            name: 'site_image_url',
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
            type: 'site_status_enum',
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
            name: 'first_charge',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'First charge percentage (%)',
          },
          {
            name: 'recharge',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'Recharge percentage (%)',
          },
          {
            name: 'experience',
            type: 'integer',
            isNullable: false,
            default: 0,
            comment: 'Experience points',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
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
            isNullable: false,
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
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create site_views table
    await queryRunner.createTable(
      new Table({
        name: 'site_views',
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
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
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
        onDelete: 'RESTRICT',
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

    // Create foreign keys for site_views
    await queryRunner.createForeignKey(
      'site_views',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_views',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
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
      'sites',
      new TableIndex({
        name: 'IDX_sites_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'site_badges',
      new TableIndex({
        name: 'IDX_site_badges_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_badges',
      new TableIndex({
        name: 'IDX_site_badges_badge_id',
        columnNames: ['badge_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_domains',
      new TableIndex({
        name: 'IDX_site_domains_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_views',
      new TableIndex({
        name: 'IDX_site_views_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_views',
      new TableIndex({
        name: 'IDX_site_views_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('site_views', 'IDX_site_views_user_id');
    await queryRunner.dropIndex('site_views', 'IDX_site_views_site_id');
    await queryRunner.dropIndex('site_domains', 'IDX_site_domains_site_id');
    await queryRunner.dropIndex('site_badges', 'IDX_site_badges_badge_id');
    await queryRunner.dropIndex('site_badges', 'IDX_site_badges_site_id');
    await queryRunner.dropIndex('sites', 'IDX_sites_status');
    await queryRunner.dropIndex('sites', 'IDX_sites_tier_id');
    await queryRunner.dropIndex('sites', 'IDX_sites_category_id');

    // Drop foreign keys
    const siteViewsTable = await queryRunner.getTable('site_views');
    if (siteViewsTable) {
      const foreignKeys = siteViewsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('site_views', foreignKey);
      }
    }

    const siteDomainsTable = await queryRunner.getTable('site_domains');
    if (siteDomainsTable) {
      const foreignKeys = siteDomainsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('site_domains', foreignKey);
      }
    }

    const siteBadgesTable = await queryRunner.getTable('site_badges');
    if (siteBadgesTable) {
      const foreignKeys = siteBadgesTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('site_badges', foreignKey);
      }
    }

    const sitesTable = await queryRunner.getTable('sites');
    if (sitesTable) {
      const foreignKeys = sitesTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('sites', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('site_views');
    await queryRunner.dropTable('site_domains');
    await queryRunner.dropTable('site_badges');
    await queryRunner.dropTable('sites');
    await queryRunner.dropTable('site_categories');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS site_status_enum`);
  }
}

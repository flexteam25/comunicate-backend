import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSiteSystemPart31765660000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create site_events table
    await queryRunner.createTable(
      new Table({
        name: 'site_events',
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
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'timestamptz',
            isNullable: false,
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create site_event_banners table
    await queryRunner.createTable(
      new Table({
        name: 'site_event_banners',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'event_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'link_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'integer',
            isNullable: false,
            default: 0,
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
        ],
      }),
      true,
    );

    // Create site_event_views table
    await queryRunner.createTable(
      new Table({
        name: 'site_event_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'event_id',
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
            isNullable: true,
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

    // Create site_manager_applications table
    await queryRunner.createTable(
      new Table({
        name: 'site_manager_applications',
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
            name: 'message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamptz',
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

    // Create site_applications table
    await queryRunner.createTable(
      new Table({
        name: 'site_applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'site_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'site_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamptz',
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

    // Create foreign keys for site_events
    await queryRunner.createForeignKey(
      'site_events',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_event_banners
    await queryRunner.createForeignKey(
      'site_event_banners',
      new TableForeignKey({
        columnNames: ['event_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_events',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_event_views
    await queryRunner.createForeignKey(
      'site_event_views',
      new TableForeignKey({
        columnNames: ['event_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_events',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_event_views',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for site_manager_applications
    await queryRunner.createForeignKey(
      'site_manager_applications',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_manager_applications',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_manager_applications',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for site_applications
    await queryRunner.createForeignKey(
      'site_applications',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_applications',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_categories',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_applications',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'site_events',
      new TableIndex({
        name: 'IDX_site_events_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_event_banners',
      new TableIndex({
        name: 'IDX_site_event_banners_event_id',
        columnNames: ['event_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_event_views',
      new TableIndex({
        name: 'IDX_site_event_views_event_id',
        columnNames: ['event_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_manager_applications',
      new TableIndex({
        name: 'IDX_site_manager_applications_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_manager_applications',
      new TableIndex({
        name: 'IDX_site_manager_applications_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_applications',
      new TableIndex({
        name: 'IDX_site_applications_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_applications',
      new TableIndex({
        name: 'IDX_site_applications_category_id',
        columnNames: ['category_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('site_applications', 'IDX_site_applications_category_id');
    await queryRunner.dropIndex('site_applications', 'IDX_site_applications_user_id');
    await queryRunner.dropIndex('site_manager_applications', 'IDX_site_manager_applications_user_id');
    await queryRunner.dropIndex('site_manager_applications', 'IDX_site_manager_applications_site_id');
    await queryRunner.dropIndex('site_event_views', 'IDX_site_event_views_event_id');
    await queryRunner.dropIndex('site_event_banners', 'IDX_site_event_banners_event_id');
    await queryRunner.dropIndex('site_events', 'IDX_site_events_site_id');

    // Drop foreign keys
    const siteApplicationsTable = await queryRunner.getTable('site_applications');
    if (siteApplicationsTable) {
      const foreignKeys = siteApplicationsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_applications', fk);
      }
    }

    const siteManagerApplicationsTable = await queryRunner.getTable('site_manager_applications');
    if (siteManagerApplicationsTable) {
      const foreignKeys = siteManagerApplicationsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_manager_applications', fk);
      }
    }

    const siteEventViewsTable = await queryRunner.getTable('site_event_views');
    if (siteEventViewsTable) {
      const foreignKeys = siteEventViewsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_event_views', fk);
      }
    }

    const siteEventBannersTable = await queryRunner.getTable('site_event_banners');
    if (siteEventBannersTable) {
      const foreignKey = siteEventBannersTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('event_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('site_event_banners', foreignKey);
      }
    }

    const siteEventsTable = await queryRunner.getTable('site_events');
    if (siteEventsTable) {
      const foreignKey = siteEventsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('site_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('site_events', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('site_applications');
    await queryRunner.dropTable('site_manager_applications');
    await queryRunner.dropTable('site_event_views');
    await queryRunner.dropTable('site_event_banners');
    await queryRunner.dropTable('site_events');
  }
}


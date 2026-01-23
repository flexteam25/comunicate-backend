import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSiteRequestsTable1768500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for site_request_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE site_request_status_enum AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create site_requests table
    await queryRunner.createTable(
      new Table({
        name: 'site_requests',
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
            comment: 'User who submitted the request',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Site name',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Site slug (optional, can be set by admin when approve)',
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Site category',
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Site logo URL',
          },
          {
            name: 'main_image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Site main image URL',
          },
          {
            name: 'site_image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Site image URL',
          },
          {
            name: 'tier_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Site tier (optional)',
          },
          {
            name: 'permanent_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Site permanent URL',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Site description',
          },
          {
            name: 'first_charge',
            type: 'integer',
            isNullable: true,
            comment: 'First charge percentage',
          },
          {
            name: 'recharge',
            type: 'integer',
            isNullable: true,
            comment: 'Recharge percentage',
          },
          {
            name: 'experience',
            type: 'integer',
            isNullable: false,
            default: 0,
            comment: 'Experience points',
          },
          {
            name: 'status',
            type: 'site_request_status_enum',
            isNullable: false,
            default: "'pending'",
            comment: 'Request status: pending, approved, rejected, cancelled',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Created site ID if approved',
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Admin who approved/rejected the request',
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
            comment: 'Reason for rejection',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
            comment: 'IP address of the user who created the request',
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

    // Create foreign keys
    await queryRunner.createForeignKey(
      'site_requests',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_site_requests_user_id',
      }),
    );

    await queryRunner.createForeignKey(
      'site_requests',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_categories',
        onDelete: 'RESTRICT',
        name: 'FK_site_requests_category_id',
      }),
    );

    await queryRunner.createForeignKey(
      'site_requests',
      new TableForeignKey({
        columnNames: ['tier_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tiers',
        onDelete: 'SET NULL',
        name: 'FK_site_requests_tier_id',
      }),
    );

    await queryRunner.createForeignKey(
      'site_requests',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'SET NULL',
        name: 'FK_site_requests_site_id',
      }),
    );

    await queryRunner.createForeignKey(
      'site_requests',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
        name: 'FK_site_requests_admin_id',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'site_requests',
      new TableIndex({
        name: 'IDX_site_requests_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_requests',
      new TableIndex({
        name: 'IDX_site_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'site_requests',
      new TableIndex({
        name: 'IDX_site_requests_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_requests',
      new TableIndex({
        name: 'IDX_site_requests_admin_id',
        columnNames: ['admin_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_requests',
      new TableIndex({
        name: 'IDX_site_requests_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create index on name (lowercase) for duplicate checking
    await queryRunner.query(`
      CREATE INDEX IDX_site_requests_name_lowercase
      ON site_requests (LOWER(name))
      WHERE deleted_at IS NULL AND status = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_site_requests_name_lowercase;
    `);

    await queryRunner.dropIndex('site_requests', 'IDX_site_requests_created_at');
    await queryRunner.dropIndex('site_requests', 'IDX_site_requests_admin_id');
    await queryRunner.dropIndex('site_requests', 'IDX_site_requests_site_id');
    await queryRunner.dropIndex('site_requests', 'IDX_site_requests_status');
    await queryRunner.dropIndex('site_requests', 'IDX_site_requests_user_id');

    // Drop foreign keys
    await queryRunner.dropForeignKey('site_requests', 'FK_site_requests_admin_id');
    await queryRunner.dropForeignKey('site_requests', 'FK_site_requests_site_id');
    await queryRunner.dropForeignKey('site_requests', 'FK_site_requests_tier_id');
    await queryRunner.dropForeignKey('site_requests', 'FK_site_requests_category_id');
    await queryRunner.dropForeignKey('site_requests', 'FK_site_requests_user_id');

    // Drop table
    await queryRunner.dropTable('site_requests', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS site_request_status_enum;
    `);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePartnerRequestsSystem1766565658312 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for partner_request_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE partner_request_status_enum AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create partner_requests table
    await queryRunner.createTable(
      new Table({
        name: 'partner_requests',
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
            name: 'status',
            type: 'partner_request_status_enum',
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
            name: 'rejection_reason',
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

    // Create foreign keys
    await queryRunner.createForeignKey(
      'partner_requests',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'partner_requests',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'partner_requests',
      new TableIndex({
        name: 'IDX_partner_requests_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'partner_requests',
      new TableIndex({
        name: 'IDX_partner_requests_status',
        columnNames: ['status'],
      }),
    );

    // Partial unique index: only one pending request per user
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_partner_requests_user_id_pending
      ON partner_requests (user_id)
      WHERE status = 'pending' AND deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_partner_requests_user_id_pending;
    `);
    await queryRunner.dropIndex('partner_requests', 'IDX_partner_requests_status');
    await queryRunner.dropIndex('partner_requests', 'IDX_partner_requests_user_id');

    // Drop foreign keys
    const table = await queryRunner.getTable('partner_requests');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('partner_requests', fk);
      }
    }

    // Drop table
    await queryRunner.dropTable('partner_requests', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS partner_request_status_enum;
    `);
  }
}

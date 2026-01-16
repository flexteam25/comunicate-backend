import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration to create blocked_ips table for global IP blocking
 * - ip: IP address (IPv4 or IPv6, max 45 chars), unique
 * - note: Optional note/reason for blocking
 * - created_by_admin_id: UUID reference to admins table (who blocked this IP)
 * - created_at: Timestamp when IP was blocked
 * - updated_at: Timestamp when IP was last updated
 */
export class CreateBlockedIpsTable1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'blocked_ips',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by_admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // Create unique constraint on ip
    await queryRunner.query(`
      ALTER TABLE "blocked_ips" 
      ADD CONSTRAINT "UQ_blocked_ips_ip" 
      UNIQUE ("ip")
    `);

    // Create foreign key to admins table
    await queryRunner.createForeignKey(
      'blocked_ips',
      new TableForeignKey({
        columnNames: ['created_by_admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'blocked_ips',
      new TableIndex({
        name: 'IDX_blocked_ips_ip',
        columnNames: ['ip'],
      }),
    );

    await queryRunner.createIndex(
      'blocked_ips',
      new TableIndex({
        name: 'IDX_blocked_ips_created_by_admin_id',
        columnNames: ['created_by_admin_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('blocked_ips', true);
  }
}

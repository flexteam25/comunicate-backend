import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration to create user_ips table for tracking user IP addresses
 * - user_id: UUID reference to users table
 * - ip: IP address (IPv4 or IPv6, max 45 chars)
 * - is_blocked: Boolean flag to block IP
 * - created_at: Timestamp when IP was first seen
 * - updated_at: Timestamp when IP was last updated
 */
export class CreateUserIpsTable1769100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_ips',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'is_blocked',
            type: 'boolean',
            default: false,
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

    // Create unique constraint on (user_id, ip)
    await queryRunner.query(`
      ALTER TABLE "user_ips" 
      ADD CONSTRAINT "UQ_user_ips_user_id_ip" 
      UNIQUE ("user_id", "ip")
    `);

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'user_ips',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'user_ips',
      new TableIndex({
        name: 'IDX_user_ips_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_ips',
      new TableIndex({
        name: 'IDX_user_ips_ip',
        columnNames: ['ip'],
      }),
    );

    await queryRunner.createIndex(
      'user_ips',
      new TableIndex({
        name: 'IDX_user_ips_is_blocked',
        columnNames: ['is_blocked'],
        where: 'is_blocked = true',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_ips', true);
  }
}


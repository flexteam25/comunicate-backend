import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOtpRequestsSystem1767630000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create otp_requests table
    await queryRunner.createTable(
      new Table({
        name: 'otp_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'otp',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'request_count',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
          {
            name: 'last_request_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'verified_at',
            type: 'timestamptz',
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
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'otp_requests',
      new TableIndex({
        name: 'IDX_otp_requests_phone',
        columnNames: ['phone'],
      }),
    );

    await queryRunner.createIndex(
      'otp_requests',
      new TableIndex({
        name: 'IDX_otp_requests_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('otp_requests', 'IDX_otp_requests_expires_at');
    await queryRunner.dropIndex('otp_requests', 'IDX_otp_requests_phone');

    // Drop table
    await queryRunner.dropTable('otp_requests', true);
  }
}

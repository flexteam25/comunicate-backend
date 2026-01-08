import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddTokenToOtpRequests1767660000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add token column
    await queryRunner.addColumn(
      'otp_requests',
      new TableColumn({
        name: 'token',
        type: 'varchar',
        length: '64',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Add token_expires_at column
    await queryRunner.addColumn(
      'otp_requests',
      new TableColumn({
        name: 'token_expires_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Create unique index for token (only for non-null tokens)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_otp_requests_token" 
      ON "otp_requests" ("token") 
      WHERE "token" IS NOT NULL
    `);

    // Create index for token_expires_at
    await queryRunner.createIndex(
      'otp_requests',
      new TableIndex({
        name: 'IDX_otp_requests_token_expires_at',
        columnNames: ['token_expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('otp_requests', 'IDX_otp_requests_token_expires_at');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_otp_requests_token"');

    // Drop columns
    await queryRunner.dropColumn('otp_requests', 'token_expires_at');
    await queryRunner.dropColumn('otp_requests', 'token');
  }
}

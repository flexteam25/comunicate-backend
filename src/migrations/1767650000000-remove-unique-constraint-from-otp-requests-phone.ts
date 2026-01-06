import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUniqueConstraintFromOtpRequestsPhone1767650000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraint on phone column
    // TypeORM creates unique constraints when isUnique: true is set on column
    // PostgreSQL creates it as a unique index, so we need to drop it by name pattern
    // Common patterns: UQ_<table>_<column>, <table>_<column>_key, or <table>_<column>_unique
    
    // Try to find and drop the unique constraint/index
    const table = await queryRunner.getTable('otp_requests');
    if (table) {
      // Find unique constraint
      const uniqueConstraint = table.uniques.find(
        (uq) => uq.columnNames.length === 1 && uq.columnNames[0] === 'phone',
      );

      if (uniqueConstraint) {
        await queryRunner.dropUniqueConstraint('otp_requests', uniqueConstraint);
      }

      // Find unique index (PostgreSQL creates unique constraints as unique indexes)
      const uniqueIndex = table.indices.find(
        (idx) => idx.isUnique && idx.columnNames.length === 1 && idx.columnNames[0] === 'phone',
      );

      if (uniqueIndex) {
        await queryRunner.dropIndex('otp_requests', uniqueIndex);
      }
    }

    // Also try dropping by common constraint names (fallback)
    // This handles cases where TypeORM/PostgreSQL created it with a different name
    try {
      await queryRunner.query(`
        ALTER TABLE "otp_requests" 
        DROP CONSTRAINT IF EXISTS "UQ_otp_requests_phone"
      `);
    } catch (error) {
      // Ignore if constraint doesn't exist
    }

    try {
      await queryRunner.query(`
        DROP INDEX IF EXISTS "otp_requests_phone_key"
      `);
    } catch (error) {
      // Ignore if index doesn't exist
    }

    // Create partial unique index: only one active record (deleted_at IS NULL) per phone
    // This ensures we can have multiple records with same phone (one deleted, one active)
    // but only one active record per phone
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_otp_requests_phone_active" 
      ON "otp_requests" ("phone") 
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partial unique index
    await queryRunner.dropIndex('otp_requests', 'UQ_otp_requests_phone_active');

    // Recreate unique constraint on phone
    await queryRunner.query(`
      ALTER TABLE "otp_requests" 
      ADD CONSTRAINT "UQ_otp_requests_phone" UNIQUE ("phone")
    `);
  }
}

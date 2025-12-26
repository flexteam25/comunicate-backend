import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTempTypeToSiteReviewStatistics1766800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'temp' to the enum
    await queryRunner.query(`
      ALTER TYPE site_review_statistics_type_enum ADD VALUE IF NOT EXISTS 'temp';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave it as is - 'temp' type can remain but not be used
    // If you need to remove it, you would need to:
    // 1. Create new enum without 'temp'
    // 2. Update all rows to use new enum values
    // 3. Drop old enum and rename new one
    // This is typically not necessary unless absolutely required
    await queryRunner.query(`
      -- Note: Cannot remove enum value directly in PostgreSQL
      -- If removal is needed, manual migration script required
    `);
  }
}

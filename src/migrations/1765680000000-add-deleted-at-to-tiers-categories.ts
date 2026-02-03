import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToTiersCategories1765680000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at to tiers (site_categories may already have it from CreateSiteSystemPart1)
    await queryRunner.query(
      `ALTER TABLE "tiers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "site_categories" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tiers" DROP COLUMN IF EXISTS "deleted_at"`,
    );
  }
}

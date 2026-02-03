import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankingFieldsToSites1766022483806 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");
    // Columns may already exist from CreateSiteSystemPart1
    await queryRunner.query(
      `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "first_charge" decimal(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "recharge" decimal(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "experience" integer DEFAULT 0 NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sites" DROP COLUMN IF EXISTS "experience"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" DROP COLUMN IF EXISTS "recharge"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" DROP COLUMN IF EXISTS "first_charge"`,
    );
  }
}

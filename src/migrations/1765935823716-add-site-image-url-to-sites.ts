import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteImageUrlToSites1765935823716 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");
    // site_image_url may already exist from CreateSiteSystemPart1
    await queryRunner.query(
      `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "site_image_url" varchar(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sites" DROP COLUMN IF EXISTS "site_image_url"`,
    );
  }
}

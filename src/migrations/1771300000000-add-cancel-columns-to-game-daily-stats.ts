import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelColumnsToGameDailyStats1771300000000 implements MigrationInterface {
  name = 'AddCancelColumnsToGameDailyStats1771300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_daily_stats"
      ADD COLUMN "total_cancel" numeric(18,4) NOT NULL DEFAULT 0,
      ADD COLUMN "count_cancel" integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_daily_stats"
      DROP COLUMN "count_cancel",
      DROP COLUMN "total_cancel";
    `);
  }
}

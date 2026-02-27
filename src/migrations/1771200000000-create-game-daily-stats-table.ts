import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGameDailyStatsTable1771200000000 implements MigrationInterface {
  name = 'CreateGameDailyStatsTable1771200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "game_daily_stats" (
        "date" date NOT NULL,
        "user_id" uuid NOT NULL,
        "game_type" varchar(50) NOT NULL,
        "total_bet" numeric(18,4) NOT NULL DEFAULT 0,
        "total_win" numeric(18,4) NOT NULL DEFAULT 0,
        "total_deduct" numeric(18,4) NOT NULL DEFAULT 0,
        "net_win" numeric(18,4) NOT NULL DEFAULT 0,
        "rounds_played" integer NOT NULL DEFAULT 0,
        "count_win" integer NOT NULL DEFAULT 0,
        "count_lose" integer NOT NULL DEFAULT 0,
        "count_draw" integer NOT NULL DEFAULT 0,
        "max_single_win" numeric(18,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_daily_stats" PRIMARY KEY ("date", "user_id", "game_type")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_game_daily_stats_date"
      ON "game_daily_stats" ("date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_game_daily_stats_date_netwin_desc"
      ON "game_daily_stats" ("date", "net_win" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_game_daily_stats_date_game_type"
      ON "game_daily_stats" ("date", "game_type");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_game_daily_stats_date_game_type"`);
    await queryRunner.query(`DROP INDEX "IDX_game_daily_stats_date_netwin_desc"`);
    await queryRunner.query(`DROP INDEX "IDX_game_daily_stats_date"`);
    await queryRunner.query(`DROP TABLE "game_daily_stats"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Change points and point transaction amounts to decimal
 * so values like 10.3, 10.5, 10.05 are preserved (e.g. from game callback).
 */
export class PointsAndTransactionsToDecimal1770800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ALTER COLUMN "points" TYPE decimal(18,4) USING points::decimal(18,4),
      ALTER COLUMN "points" SET DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "point_transactions"
      ALTER COLUMN "amount" TYPE decimal(18,4) USING amount::decimal(18,4)
    `);
    await queryRunner.query(`
      ALTER TABLE "point_transactions"
      ALTER COLUMN "balance_after" TYPE decimal(18,4) USING balance_after::decimal(18,4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ALTER COLUMN "points" TYPE integer USING ROUND(points)::integer,
      ALTER COLUMN "points" SET DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "point_transactions"
      ALTER COLUMN "amount" TYPE integer USING ROUND(amount)::integer
    `);
    await queryRunner.query(`
      ALTER TABLE "point_transactions"
      ALTER COLUMN "balance_after" TYPE integer USING ROUND(balance_after)::integer
    `);
  }
}

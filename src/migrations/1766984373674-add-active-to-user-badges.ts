import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddActiveToUserBadges1766984373674 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add active column to user_badges table
    await queryRunner.addColumn(
      'user_badges',
      new TableColumn({
        name: 'active',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Create index on active column for faster filtering
    await queryRunner.query(
      `CREATE INDEX "IDX_user_badges_active" ON "user_badges" ("active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_badges_active"`);

    // Drop column
    await queryRunner.dropColumn('user_badges', 'active');
  }
}

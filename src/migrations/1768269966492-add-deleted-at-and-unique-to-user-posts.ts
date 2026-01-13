import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtAndUniqueToUserPosts1768269966492 implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at column
    await queryRunner.addColumn(
      'user_posts',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Create unique constraint on (user_id, post_id)
    // Note: This will only apply to non-deleted records if we use partial unique index
    // For now, we'll create a regular unique constraint
    // In PostgreSQL, we can use a partial unique index to ignore deleted records
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_posts_user_post" 
      ON "user_posts" ("user_id", "post_id") 
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_user_posts_user_post"
    `);

    // Drop deleted_at column
    await queryRunner.dropColumn('user_posts', 'deleted_at');
  }
}

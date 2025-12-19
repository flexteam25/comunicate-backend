import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Updatesitereviewsschema1766118140089 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Remove like_count from site_reviews
    const siteReviewsTable = await queryRunner.getTable('site_reviews');
    const siteReviewsLikeCountColumn = siteReviewsTable?.findColumnByName('like_count');

    if (siteReviewsLikeCountColumn) {
      await queryRunner.dropColumn('site_reviews', 'like_count');
    }

    // Remove like_count from site_review_comments
    const siteReviewCommentsTable = await queryRunner.getTable('site_review_comments');
    const siteReviewCommentsLikeCountColumn =
      siteReviewCommentsTable?.findColumnByName('like_count');

    if (siteReviewCommentsLikeCountColumn) {
      await queryRunner.dropColumn('site_review_comments', 'like_count');
    }

    // Change is_published default from true to false
    await queryRunner.query(`
      ALTER TABLE "site_reviews" 
      ALTER COLUMN "is_published" SET DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add like_count to site_review_comments
    const siteReviewCommentsTable = await queryRunner.getTable('site_review_comments');
    const siteReviewCommentsLikeCountColumn =
      siteReviewCommentsTable?.findColumnByName('like_count');

    if (!siteReviewCommentsLikeCountColumn) {
      await queryRunner.addColumn(
        'site_review_comments',
        new TableColumn({
          name: 'like_count',
          type: 'integer',
          isNullable: false,
          default: 0,
        }),
      );
    }

    // Re-add like_count to site_reviews
    const siteReviewsTable = await queryRunner.getTable('site_reviews');
    const siteReviewsLikeCountColumn = siteReviewsTable?.findColumnByName('like_count');

    if (!siteReviewsLikeCountColumn) {
      await queryRunner.addColumn(
        'site_reviews',
        new TableColumn({
          name: 'like_count',
          type: 'integer',
          isNullable: false,
          default: 0,
        }),
      );
    }

    // Change is_published default back to true
    await queryRunner.query(`
      ALTER TABLE "site_reviews" 
      ALTER COLUMN "is_published" SET DEFAULT true
    `);
  }
}

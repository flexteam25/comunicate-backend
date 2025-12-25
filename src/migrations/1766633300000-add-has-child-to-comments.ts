import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHasChildToComments1766633300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add has_child column to post_comments table
    await queryRunner.addColumn(
      'post_comments',
      new TableColumn({
        name: 'has_child',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    // Add has_child column to site_review_comments table
    await queryRunner.addColumn(
      'site_review_comments',
      new TableColumn({
        name: 'has_child',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    // Add has_child column to scam_report_comments table
    await queryRunner.addColumn(
      'scam_report_comments',
      new TableColumn({
        name: 'has_child',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    // Update existing records: set has_child = true if they have children
    await queryRunner.query(`
      UPDATE post_comments
      SET has_child = true
      WHERE id IN (
        SELECT DISTINCT parent_comment_id
        FROM post_comments
        WHERE parent_comment_id IS NOT NULL
        AND deleted_at IS NULL
      )
    `);

    await queryRunner.query(`
      UPDATE site_review_comments
      SET has_child = true
      WHERE id IN (
        SELECT DISTINCT parent_comment_id
        FROM site_review_comments
        WHERE parent_comment_id IS NOT NULL
        AND deleted_at IS NULL
      )
    `);

    await queryRunner.query(`
      UPDATE scam_report_comments
      SET has_child = true
      WHERE id IN (
        SELECT DISTINCT parent_comment_id
        FROM scam_report_comments
        WHERE parent_comment_id IS NOT NULL
        AND deleted_at IS NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove has_child column from scam_report_comments table
    await queryRunner.dropColumn('scam_report_comments', 'has_child');

    // Remove has_child column from site_review_comments table
    await queryRunner.dropColumn('site_review_comments', 'has_child');

    // Remove has_child column from post_comments table
    await queryRunner.dropColumn('post_comments', 'has_child');
  }
}

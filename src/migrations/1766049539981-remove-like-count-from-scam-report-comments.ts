import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveLikeCountFromScamReportComments1766049539981 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before dropping
    const table = await queryRunner.getTable('scam_report_comments');
    const likeCountColumn = table?.findColumnByName('like_count');

    if (likeCountColumn) {
      await queryRunner.dropColumn('scam_report_comments', 'like_count');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the column if rolling back
    const table = await queryRunner.getTable('scam_report_comments');
    const likeCountColumn = table?.findColumnByName('like_count');

    if (!likeCountColumn) {
      await queryRunner.addColumn(
        'scam_report_comments',
        new TableColumn({
          name: 'like_count',
          type: 'integer',
          isNullable: false,
          default: 0,
        }),
      );
    }
  }
}

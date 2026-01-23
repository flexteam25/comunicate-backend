import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePostPointSettings1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Delete the 3 post-related point settings
    // Points will now be managed via post_categories.point
    await queryRunner.query(`
      DELETE FROM point_settings 
      WHERE key IN ('post_promotion', 'post_job', 'post_poca')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the 3 point settings (if needed for rollback)
    await queryRunner.query(`
      INSERT INTO point_settings (key, name, name_ko, point)
      VALUES
        ('post_promotion', '홍보게시판 글작성 (Promotion board post)', '홍보게시판 글작성', -3000),
        ('post_job', '구인/구직 글작성 (Job board post)', '구인/구직 글작성', -2000),
        ('post_poca', '포카게시판 글작성 (Poca board post)', '포카게시판 글작성', 100)
      ON CONFLICT (key) DO NOTHING
    `);
  }
}

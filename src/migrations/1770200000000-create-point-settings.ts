import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePointSettings1770200000000 implements MigrationInterface {
  name = 'CreatePointSettings1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'point_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'key',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'name_ko',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'point',
            type: 'integer',
          },
        ],
      }),
      true,
    );

    // Seed default settings based on point-info.html
    await queryRunner.query(`
      INSERT INTO point_settings (key, name, name_ko, point)
      VALUES
        ('register', '회원가입 (Sign up)', '회원가입', 1000),
        ('first_login_daily', '당일 첫 로그인 (First login of the day)', '당일 첫 로그인', 100),
        ('attendance', '출석체크 (Attendance check)', '출석체크', 300),
        ('post_promotion', '홍보게시판 글작성 (Promotion board post)', '홍보게시판 글작성', -3000),
        ('post_job', '구인/구직 글작성 (Job board post)', '구인/구직 글작성', -2000),
        ('post_poca', '포카게시판 글작성 (Poca board post)', '포카게시판 글작성', 100),
        ('comment_any_board', '모든 게시판 댓글 작성 (Comment on any board)', '모든 게시판 댓글 작성', 35),
        ('report_site_scam', '사이트 먹튀제보 (Report scam site)', '사이트 먹튀제보', 500),
        ('site_registration_request', '사이트 등록신청 (Site registration request)', '사이트 등록신청', 500),
        ('site_review', '사이트 후기작성 (Site review)', '사이트 후기작성', 500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('point_settings');
  }
}

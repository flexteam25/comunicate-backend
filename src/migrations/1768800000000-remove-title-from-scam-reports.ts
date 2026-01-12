import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveTitleFromScamReports1768800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('scam_reports', 'title');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'scam_reports',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '255',
        isNullable: false,
      }),
    );
  }
}

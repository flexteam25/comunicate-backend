import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNameKoToSiteCategories1768300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'site_categories',
      new TableColumn({
        name: 'name_ko',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('site_categories', 'name_ko');
  }
}

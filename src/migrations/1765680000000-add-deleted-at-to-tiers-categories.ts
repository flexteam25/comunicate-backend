import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToTiersCategories1765680000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at to tiers
    await queryRunner.addColumn(
      'tiers',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Add deleted_at to site_categories
    await queryRunner.addColumn(
      'site_categories',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('site_categories', 'deleted_at');
    await queryRunner.dropColumn('tiers', 'deleted_at');
  }
}

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToBadgesTiersCategories1765670000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_active to badges
    await queryRunner.addColumn(
      'badges',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );

    // Add is_active to tiers
    await queryRunner.addColumn(
      'tiers',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );

    // Add is_active to site_categories
    await queryRunner.addColumn(
      'site_categories',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('site_categories', 'is_active');
    await queryRunner.dropColumn('tiers', 'is_active');
    await queryRunner.dropColumn('badges', 'is_active');
  }
}

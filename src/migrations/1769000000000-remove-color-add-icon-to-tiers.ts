import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveColorAddIconToTiers1769000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add icon_url column
    await queryRunner.addColumn(
      'tiers',
      new TableColumn({
        name: 'icon_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Add icon_name column
    await queryRunner.addColumn(
      'tiers',
      new TableColumn({
        name: 'icon_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Drop color column
    await queryRunner.dropColumn('tiers', 'color');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add color column back
    await queryRunner.addColumn(
      'tiers',
      new TableColumn({
        name: 'color',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    // Drop icon columns
    await queryRunner.dropColumn('tiers', 'icon_name');
    await queryRunner.dropColumn('tiers', 'icon_url');
  }
}


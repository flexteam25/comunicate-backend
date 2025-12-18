import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRankingFieldsToSites1766022483806 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Add first_charge column
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'first_charge',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
        comment: 'First charge percentage (%)',
      }),
    );

    // Add recharge column
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'recharge',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
        comment: 'Recharge percentage (%)',
      }),
    );

    // Add experience column
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'experience',
        type: 'integer',
        default: 0,
        isNullable: false,
        comment: 'Experience points',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sites', 'experience');
    await queryRunner.dropColumn('sites', 'recharge');
    await queryRunner.dropColumn('sites', 'first_charge');
  }
}

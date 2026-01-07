import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPointToBadges1767700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'badges',
      new TableColumn({
        name: 'point',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('badges', 'point');
  }
}

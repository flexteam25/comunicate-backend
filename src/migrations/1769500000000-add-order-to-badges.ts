import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderToBadges1769500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'badges',
      new TableColumn({
        name: 'order',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('badges', 'order');
  }
}

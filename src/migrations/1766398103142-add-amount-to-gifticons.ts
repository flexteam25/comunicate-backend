import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAmountToGifticons1766398103142 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'gifticons',
      new TableColumn({
        name: 'amount',
        type: 'integer',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('gifticons', 'amount');
  }
}

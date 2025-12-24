import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTypeColorToGifticons1766563282613 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'gifticons',
      new TableColumn({
        name: 'type_color',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('gifticons', 'type_color');
  }
}

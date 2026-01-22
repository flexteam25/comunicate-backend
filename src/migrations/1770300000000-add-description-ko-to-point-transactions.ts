import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDescriptionKoToPointTransactions1770300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add description_ko column
    await queryRunner.addColumn(
      'point_transactions',
      new TableColumn({
        name: 'description_ko',
        type: 'text',
        isNullable: true,
        comment: 'Transaction description in Korean',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop description_ko column
    await queryRunner.dropColumn('point_transactions', 'description_ko');
  }
}

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTetherDepositWithdrawalStatusToSites1768225244215
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add tether_deposit_withdrawal_status column to sites table
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'tether_deposit_withdrawal_status',
        type: 'varchar',
        length: '20',
        isNullable: true,
        default: "'no_info'",
        comment: 'Tether deposit/withdrawal status: possible, not_possible, no_info',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove tether_deposit_withdrawal_status column from sites table
    await queryRunner.dropColumn('sites', 'tether_deposit_withdrawal_status');
  }
}
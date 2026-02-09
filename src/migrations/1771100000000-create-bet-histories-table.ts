import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Migration to create bet_histories table (game callback bet/win history).
 * - id: UUID PK
 * - user_id, game_type, round_number (nullable when bet has no round yet)
 * - tx_ref: idempotency / lookup from callback
 * - bet_amount, coin_type, payout, payout_amount, max_payout_deduct
 * - round_result, created_at, updated_at
 */
export class CreateBetHistoriesTable1771100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    await queryRunner.createTable(
      new Table({
        name: 'bet_histories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'game_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'round_number',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tx_ref',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bet_amount',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'coin_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'point'",
          },
          {
            name: 'payout',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'payout_amount',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'max_payout_deduct',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'round_result',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'bet_histories',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'bet_histories',
      new TableIndex({
        name: 'IDX_bet_histories_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'bet_histories',
      new TableIndex({
        name: 'IDX_bet_histories_game_type',
        columnNames: ['game_type'],
      }),
    );
    await queryRunner.createIndex(
      'bet_histories',
      new TableIndex({
        name: 'IDX_bet_histories_round_number',
        columnNames: ['round_number'],
      }),
    );
    await queryRunner.createIndex(
      'bet_histories',
      new TableIndex({
        name: 'IDX_bet_histories_tx_ref',
        columnNames: ['tx_ref'],
      }),
    );
    await queryRunner.createIndex(
      'bet_histories',
      new TableIndex({
        name: 'IDX_bet_histories_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('bet_histories');
    if (table?.foreignKeys) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('bet_histories', fk);
      }
    }
    await queryRunner.dropTable('bet_histories', true);
  }
}

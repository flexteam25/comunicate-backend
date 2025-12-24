import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePointTransactionsSystem1766540906228
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for point_transaction_type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE point_transaction_type_enum AS ENUM ('earn', 'spend', 'refund');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create point_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'point_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'point_transaction_type_enum',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'integer',
            isNullable: false,
            comment: 'Points amount (positive for earn, negative for spend)',
          },
          {
            name: 'balance_after',
            type: 'integer',
            isNullable: false,
            comment: 'Balance after transaction',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment:
              "Transaction category: 'attendance', 'gifticon_redemption', 'point_exchange', 'refund', etc.",
          },
          {
            name: 'reference_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment:
              "Reference type: 'gifticon_redemption', 'point_exchange', 'attendance', etc.",
          },
          {
            name: 'reference_id',
            type: 'uuid',
            isNullable: true,
            comment:
              'ID of related object (gifticon_redemption_id, point_exchange_id, etc.)',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Transaction description (e.g., "Gifticon: Starbucks 10,000원")',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Additional information (flexible data)',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'point_transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'point_transactions',
      new TableIndex({
        name: 'IDX_point_transactions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'point_transactions',
      new TableIndex({
        name: 'IDX_point_transactions_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'point_transactions',
      new TableIndex({
        name: 'IDX_point_transactions_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'point_transactions',
      new TableIndex({
        name: 'IDX_point_transactions_reference',
        columnNames: ['reference_type', 'reference_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'point_transactions',
      'IDX_point_transactions_reference',
    );
    await queryRunner.dropIndex(
      'point_transactions',
      'IDX_point_transactions_category',
    );
    await queryRunner.dropIndex(
      'point_transactions',
      'IDX_point_transactions_created_at',
    );
    await queryRunner.dropIndex(
      'point_transactions',
      'IDX_point_transactions_user_id',
    );

    // Drop foreign keys
    const table = await queryRunner.getTable('point_transactions');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('point_transactions', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('point_transactions');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS point_transaction_type_enum`);
  }
}

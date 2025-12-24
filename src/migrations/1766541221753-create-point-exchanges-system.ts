import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePointExchangesSystem1766541221753 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for point_exchange_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE point_exchange_status_enum AS ENUM ('pending', 'processing', 'completed', 'rejected', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create point_exchanges table
    await queryRunner.createTable(
      new Table({
        name: 'point_exchanges',
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
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'points_amount',
            type: 'integer',
            isNullable: false,
            comment: 'Points amount to exchange',
          },
          {
            name: 'site_currency_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
            comment: 'Site currency amount (KRW)',
          },
          {
            name: 'exchange_rate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
            comment: 'Exchange rate (points : currency)',
          },
          {
            name: 'site_user_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'User ID on partner site',
          },
          {
            name: 'status',
            type: 'point_exchange_status_enum',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Admin who processed the exchange',
          },
          {
            name: 'processed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'point_exchanges',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'point_exchanges',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'point_exchanges',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'point_exchanges',
      new TableIndex({
        name: 'IDX_point_exchanges_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'point_exchanges',
      new TableIndex({
        name: 'IDX_point_exchanges_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'point_exchanges',
      new TableIndex({
        name: 'IDX_point_exchanges_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'point_exchanges',
      new TableIndex({
        name: 'IDX_point_exchanges_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('point_exchanges', 'IDX_point_exchanges_created_at');
    await queryRunner.dropIndex('point_exchanges', 'IDX_point_exchanges_status');
    await queryRunner.dropIndex('point_exchanges', 'IDX_point_exchanges_site_id');
    await queryRunner.dropIndex('point_exchanges', 'IDX_point_exchanges_user_id');

    // Drop foreign keys
    const table = await queryRunner.getTable('point_exchanges');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('point_exchanges', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('point_exchanges');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS point_exchange_status_enum`);
  }
}

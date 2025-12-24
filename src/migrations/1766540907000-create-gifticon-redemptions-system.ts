import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateGifticonRedemptionsSystem1766540907000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create enum type for gifticon_redemption_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gifticon_redemption_status_enum AS ENUM ('pending', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create gifticon_redemptions table
    await queryRunner.createTable(
      new Table({
        name: 'gifticon_redemptions',
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
            name: 'gifticon_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'points_used',
            type: 'integer',
            isNullable: false,
            comment: 'Points used for redemption',
          },
          {
            name: 'status',
            type: 'gifticon_redemption_status_enum',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'redemption_code',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
            comment: 'Redemption code for user to use gifticon (UUID format)',
          },
          {
            name: 'gifticon_snapshot',
            type: 'jsonb',
            isNullable: true,
            comment: 'Gifticon information snapshot at redemption time (JSON: { title, amount, imageUrl, summary })',
          },
          {
            name: 'cancelled_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'cancelled_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cancellation_reason',
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
      'gifticon_redemptions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'gifticon_redemptions',
      new TableForeignKey({
        columnNames: ['gifticon_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gifticons',
        onDelete: 'RESTRICT',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'gifticon_redemptions',
      new TableIndex({
        name: 'IDX_gifticon_redemptions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'gifticon_redemptions',
      new TableIndex({
        name: 'IDX_gifticon_redemptions_gifticon_id',
        columnNames: ['gifticon_id'],
      }),
    );

    await queryRunner.createIndex(
      'gifticon_redemptions',
      new TableIndex({
        name: 'IDX_gifticon_redemptions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'gifticon_redemptions',
      new TableIndex({
        name: 'IDX_gifticon_redemptions_redemption_code',
        columnNames: ['redemption_code'],
      }),
    );

    await queryRunner.createIndex(
      'gifticon_redemptions',
      new TableIndex({
        name: 'IDX_gifticon_redemptions_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'gifticon_redemptions',
      'IDX_gifticon_redemptions_created_at',
    );
    await queryRunner.dropIndex(
      'gifticon_redemptions',
      'IDX_gifticon_redemptions_redemption_code',
    );
    await queryRunner.dropIndex(
      'gifticon_redemptions',
      'IDX_gifticon_redemptions_status',
    );
    await queryRunner.dropIndex(
      'gifticon_redemptions',
      'IDX_gifticon_redemptions_gifticon_id',
    );
    await queryRunner.dropIndex(
      'gifticon_redemptions',
      'IDX_gifticon_redemptions_user_id',
    );

    // Drop foreign keys
    const table = await queryRunner.getTable('gifticon_redemptions');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('gifticon_redemptions', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('gifticon_redemptions');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS gifticon_redemption_status_enum`);
  }
}

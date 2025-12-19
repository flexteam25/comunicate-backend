import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserOldPasswords1765425187835 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create user_old_passwords table
    await queryRunner.createTable(
      new Table({
        name: 'user_old_passwords',
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
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'change'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'user_old_passwords',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on user_id for faster queries
    await queryRunner.createIndex(
      'user_old_passwords',
      new TableIndex({
        name: 'IDX_user_old_passwords_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create index on created_at for sorting
    await queryRunner.createIndex(
      'user_old_passwords',
      new TableIndex({
        name: 'IDX_user_old_passwords_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'user_old_passwords',
      'IDX_user_old_passwords_created_at',
    );
    await queryRunner.dropIndex('user_old_passwords', 'IDX_user_old_passwords_user_id');

    // Drop foreign key
    const table = await queryRunner.getTable('user_old_passwords');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('user_old_passwords', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('user_old_passwords');
  }
}

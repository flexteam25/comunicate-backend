import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class MakeUserIdNullableInScamReports1766977504336 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Get the table to find foreign key
    const table = await queryRunner.getTable('scam_reports');
    if (!table) {
      throw new Error('scam_reports table does not exist');
    }

    // Find and drop the foreign key for user_id
    const userFk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );

    if (userFk) {
      await queryRunner.dropForeignKey('scam_reports', userFk);
    }

    // Alter user_id column to be nullable
    await queryRunner.changeColumn(
      'scam_reports',
      'user_id',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Recreate foreign key with nullable support
    await queryRunner.createForeignKey(
      'scam_reports',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Get the table to find foreign key
    const table = await queryRunner.getTable('scam_reports');
    if (!table) {
      throw new Error('scam_reports table does not exist');
    }

    // Find and drop the foreign key for user_id
    const userFk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );

    if (userFk) {
      await queryRunner.dropForeignKey('scam_reports', userFk);
    }

    // First, set all NULL user_id to a default value (or delete those rows)
    // For safety, we'll just make it non-nullable and let the database handle it
    // In production, you might want to handle existing NULL values first
    await queryRunner.query(`
      UPDATE scam_reports 
      SET user_id = (SELECT id FROM users LIMIT 1)
      WHERE user_id IS NULL
    `);

    // Alter user_id column to be NOT NULL
    await queryRunner.changeColumn(
      'scam_reports',
      'user_id',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    // Recreate foreign key
    await queryRunner.createForeignKey(
      'scam_reports',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }
}

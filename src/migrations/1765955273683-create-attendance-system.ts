import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateAttendanceSystem1765955273683 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create attendances table
    await queryRunner.createTable(
      new Table({
        name: 'attendances',
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
            name: 'message',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: 'Message from user (max 20 chars)',
          },
          {
            name: 'attendance_date',
            type: 'date',
            isNullable: false,
            comment: 'Date of attendance (date only, no time)',
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

    // Create unique constraint: 1 user can only check-in once per day
    await queryRunner.createUniqueConstraint(
      'attendances',
      new TableUnique({
        name: 'unique_user_date',
        columnNames: ['user_id', 'attendance_date'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'attendances',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for fast lookups
    await queryRunner.createIndex(
      'attendances',
      new TableIndex({
        name: 'IDX_attendances_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'attendances',
      new TableIndex({
        name: 'IDX_attendances_attendance_date',
        columnNames: ['attendance_date'],
      }),
    );

    await queryRunner.createIndex(
      'attendances',
      new TableIndex({
        name: 'IDX_attendances_user_date',
        columnNames: ['user_id', 'attendance_date'],
      }),
    );

    await queryRunner.createIndex(
      'attendances',
      new TableIndex({
        name: 'IDX_attendances_date_created',
        columnNames: ['attendance_date', 'created_at'],
      }),
    );

    // Create attendance_statistics table
    await queryRunner.createTable(
      new Table({
        name: 'attendance_statistics',
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
            name: 'statistic_date',
            type: 'date',
            isNullable: false,
            comment: 'Date of statistics (date only)',
          },
          {
            name: 'total_attendance_days',
            type: 'integer',
            isNullable: false,
            default: 0,
            comment: 'Total number of attendance days up to this date',
          },
          {
            name: 'current_streak',
            type: 'integer',
            isNullable: false,
            default: 0,
            comment: 'Current consecutive attendance days',
          },
          {
            name: 'attendance_time',
            type: 'timestamptz',
            isNullable: true,
            comment: 'Time of check-in on this date',
          },
          {
            name: 'attendance_rank',
            type: 'integer',
            isNullable: true,
            comment: 'Rank of user on this date (based on check-in time)',
          },
          {
            name: 'daily_message',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: 'Message from user on this date',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint: 1 statistic record per user per date
    await queryRunner.createUniqueConstraint(
      'attendance_statistics',
      new TableUnique({
        name: 'unique_user_statistic_date',
        columnNames: ['user_id', 'statistic_date'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'attendance_statistics',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for fast lookups
    await queryRunner.createIndex(
      'attendance_statistics',
      new TableIndex({
        name: 'IDX_attendance_statistics_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_statistics',
      new TableIndex({
        name: 'IDX_attendance_statistics_statistic_date',
        columnNames: ['statistic_date'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_statistics',
      new TableIndex({
        name: 'IDX_attendance_statistics_user_date',
        columnNames: ['user_id', 'statistic_date'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_statistics',
      new TableIndex({
        name: 'IDX_attendance_statistics_date_rank',
        columnNames: ['statistic_date', 'attendance_rank'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for attendance_statistics
    await queryRunner.dropIndex(
      'attendance_statistics',
      'IDX_attendance_statistics_date_rank',
    );
    await queryRunner.dropIndex(
      'attendance_statistics',
      'IDX_attendance_statistics_user_date',
    );
    await queryRunner.dropIndex(
      'attendance_statistics',
      'IDX_attendance_statistics_statistic_date',
    );
    await queryRunner.dropIndex(
      'attendance_statistics',
      'IDX_attendance_statistics_user_id',
    );

    // Drop foreign keys for attendance_statistics
    const statisticsTable = await queryRunner.getTable('attendance_statistics');
    if (statisticsTable) {
      for (const fk of statisticsTable.foreignKeys) {
        await queryRunner.dropForeignKey('attendance_statistics', fk);
      }
    }

    // Drop unique constraint for attendance_statistics
    await queryRunner.dropIndex('attendance_statistics', 'unique_user_statistic_date');

    // Drop table attendance_statistics
    await queryRunner.dropTable('attendance_statistics');

    // Drop indexes for attendances
    await queryRunner.dropIndex('attendances', 'IDX_attendances_date_created');
    await queryRunner.dropIndex('attendances', 'IDX_attendances_user_date');
    await queryRunner.dropIndex('attendances', 'IDX_attendances_attendance_date');
    await queryRunner.dropIndex('attendances', 'IDX_attendances_user_id');

    // Drop foreign keys for attendances
    const attendancesTable = await queryRunner.getTable('attendances');
    if (attendancesTable) {
      for (const fk of attendancesTable.foreignKeys) {
        await queryRunner.dropForeignKey('attendances', fk);
      }
    }

    // Drop unique constraint for attendances
    await queryRunner.dropIndex('attendances', 'unique_user_date');

    // Drop table attendances
    await queryRunner.dropTable('attendances');
  }
}

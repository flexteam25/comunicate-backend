import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddUserIdAndDeletedAtToOtpRequests1767640000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add user_id column
    await queryRunner.addColumn(
      'otp_requests',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add deleted_at column
    await queryRunner.addColumn(
      'otp_requests',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'otp_requests',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Add index for user_id
    await queryRunner.createIndex(
      'otp_requests',
      new TableIndex({
        name: 'IDX_otp_requests_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Add index for deleted_at
    await queryRunner.createIndex(
      'otp_requests',
      new TableIndex({
        name: 'IDX_otp_requests_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('otp_requests', 'IDX_otp_requests_deleted_at');
    await queryRunner.dropIndex('otp_requests', 'IDX_otp_requests_user_id');

    // Drop foreign key
    const table = await queryRunner.getTable('otp_requests');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('otp_requests', foreignKey);
    }

    // Drop columns
    await queryRunner.dropColumn('otp_requests', 'deleted_at');
    await queryRunner.dropColumn('otp_requests', 'user_id');
  }
}

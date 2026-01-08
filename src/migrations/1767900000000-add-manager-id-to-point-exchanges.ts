import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddManagerIdToPointExchanges1767900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add manager_id column
    await queryRunner.addColumn(
      'point_exchanges',
      new TableColumn({
        name: 'manager_id',
        type: 'uuid',
        isNullable: true,
        comment: 'Manager (site manager) who processed the exchange',
      }),
    );

    // Add foreign key constraint to users table
    await queryRunner.createForeignKey(
      'point_exchanges',
      new TableForeignKey({
        columnNames: ['manager_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add index for manager_id
    await queryRunner.createIndex(
      'point_exchanges',
      new TableIndex({
        name: 'IDX_point_exchanges_manager_id',
        columnNames: ['manager_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('point_exchanges', 'IDX_point_exchanges_manager_id');

    // Drop foreign key
    const table = await queryRunner.getTable('point_exchanges');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('manager_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('point_exchanges', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('point_exchanges', 'manager_id');
  }
}

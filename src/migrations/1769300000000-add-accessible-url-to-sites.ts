import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAccessibleUrlToSites1769300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'accessible_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sites', 'accessible_url');
  }
}

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIconNameToBadges1768000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'badges',
      new TableColumn({
        name: 'icon_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('badges', 'icon_name');
  }
}

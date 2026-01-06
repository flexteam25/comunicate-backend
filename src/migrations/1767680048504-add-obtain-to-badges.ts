import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddObtainToBadges1767680048504 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add obtain column to badges table
    await queryRunner.addColumn(
      'badges',
      new TableColumn({
        name: 'obtain',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop obtain column
    await queryRunner.dropColumn('badges', 'obtain');
  }
}

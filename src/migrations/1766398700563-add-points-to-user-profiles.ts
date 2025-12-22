import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPointsToUserProfiles1766398700563 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user_profiles',
      new TableColumn({
        name: 'points',
        type: 'integer',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user_profiles', 'points');
  }
}

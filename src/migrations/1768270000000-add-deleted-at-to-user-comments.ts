import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToUserComments1768270000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at column
    await queryRunner.addColumn(
      'user_comments',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop deleted_at column
    await queryRunner.dropColumn('user_comments', 'deleted_at');
  }
}

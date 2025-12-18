import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateScamReportImages1766043100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create scam_report_images table
    await queryRunner.createTable(
      new Table({
        name: 'scam_report_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'scam_report_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'order',
            type: 'integer',
            isNullable: false,
            default: 0,
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

    // Add foreign key
    await queryRunner.createForeignKey(
      'scam_report_images',
      new TableForeignKey({
        columnNames: ['scam_report_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'scam_reports',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      'scam_report_images',
      new TableIndex({
        name: 'IDX_scam_report_images_scam_report_id',
        columnNames: ['scam_report_id'],
      }),
    );

    await queryRunner.createIndex(
      'scam_report_images',
      new TableIndex({
        name: 'IDX_scam_report_images_order',
        columnNames: ['scam_report_id', 'order'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('scam_report_images', 'IDX_scam_report_images_order');
    await queryRunner.dropIndex('scam_report_images', 'IDX_scam_report_images_scam_report_id');

    // Drop foreign key
    const table = await queryRunner.getTable('scam_report_images');
    const fk = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('scam_report_id') !== -1);
    if (fk) {
      await queryRunner.dropForeignKey('scam_report_images', fk);
    }

    // Drop table
    await queryRunner.dropTable('scam_report_images');
  }
}

import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddContentAndImagesToSiteBadgeRequests1769600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Add content column to site_badge_requests
    await queryRunner.addColumn(
      'site_badge_requests',
      new TableColumn({
        name: 'content',
        type: 'text',
        isNullable: true,
      }),
    );

    // Create site_badge_request_images table
    await queryRunner.createTable(
      new Table({
        name: 'site_badge_request_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'request_id',
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
            isNullable: true,
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

    // Create foreign key
    await queryRunner.createForeignKey(
      'site_badge_request_images',
      new TableForeignKey({
        columnNames: ['request_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_badge_requests',
        onDelete: 'CASCADE',
      }),
    );

    // Create index
    await queryRunner.createIndex(
      'site_badge_request_images',
      new TableIndex({
        name: 'IDX_site_badge_request_images_request_id',
        columnNames: ['request_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('site_badge_request_images', 'IDX_site_badge_request_images_request_id');

    // Drop foreign key
    const table = await queryRunner.getTable('site_badge_request_images');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('request_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('site_badge_request_images', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('site_badge_request_images');

    // Drop content column
    await queryRunner.dropColumn('site_badge_requests', 'content');
  }
}

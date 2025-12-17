import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSiteImageUrlToSites1765935823716 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add site_image_url column to sites table
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'site_image_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'Relative path to site image',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove site_image_url column from sites table
    await queryRunner.dropColumn('sites', 'site_image_url');
  }
}

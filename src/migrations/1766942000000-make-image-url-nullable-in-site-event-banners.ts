import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakeImageUrlNullableInSiteEventBanners1766942000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Change image_url column to nullable
    await queryRunner.changeColumn(
      'site_event_banners',
      'image_url',
      new TableColumn({
        name: 'image_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert image_url column to not nullable
    // Note: This will fail if there are any NULL values in the column
    await queryRunner.changeColumn(
      'site_event_banners',
      'image_url',
      new TableColumn({
        name: 'image_url',
        type: 'varchar',
        length: '500',
        isNullable: false,
      }),
    );
  }
}

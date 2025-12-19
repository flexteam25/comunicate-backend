import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateInquirySystem1766137602873 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add title and category columns to inquiries table
    await queryRunner.addColumn(
      'inquiries',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '255',
        isNullable: false,
        default: "''",
      }),
    );

    await queryRunner.addColumn(
      'inquiries',
      new TableColumn({
        name: 'category',
        type: 'varchar',
        length: '20',
        isNullable: false,
        default: "'inquiry'",
      }),
    );

    // Create enum type for category if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE inquiry_category_enum AS ENUM ('inquiry', 'feedback', 'bug', 'advertisement');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Drop default before changing type
    await queryRunner.query(`
      ALTER TABLE inquiries
      ALTER COLUMN category DROP DEFAULT;
    `);

    // Alter category column to use enum
    await queryRunner.query(`
      ALTER TABLE inquiries
      ALTER COLUMN category TYPE inquiry_category_enum USING category::inquiry_category_enum;
    `);

    // Set default again on enum column
    await queryRunner.query(`
      ALTER TABLE inquiries
      ALTER COLUMN category SET DEFAULT 'inquiry';
    `);

    // Drop feedbacks, bug_reports, and advertising_contacts tables
    await queryRunner.dropTable('feedbacks', true);
    await queryRunner.dropTable('bug_reports', true);
    await queryRunner.dropTable('advertising_contacts', true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This is a destructive migration, so we won't restore the dropped tables
    // We'll only revert the inquiries table changes

    // Remove title and category columns
    await queryRunner.dropColumn('inquiries', 'category');
    await queryRunner.dropColumn('inquiries', 'title');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS inquiry_category_enum;`);
  }
}


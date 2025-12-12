import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateScamReportSystem1765630000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create scam_reports table
    await queryRunner.createTable(
      new Table({
        name: 'scam_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamptz',
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create scam_report_comments table
    await queryRunner.createTable(
      new Table({
        name: 'scam_report_comments',
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
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'parent_comment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'like_count',
            type: 'integer',
            isNullable: false,
            default: 0,
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create scam_report_comment_images table
    await queryRunner.createTable(
      new Table({
        name: 'scam_report_comment_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'comment_id',
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

    // Create scam_report_reactions table
    await queryRunner.createTable(
      new Table({
        name: 'scam_report_reactions',
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
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reaction_type',
            type: 'varchar',
            length: '10',
            isNullable: false,
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

    // Create scam_report_site table (Many-to-Many relation)
    await queryRunner.createTable(
      new Table({
        name: 'scam_report_site',
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
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
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

    // Create foreign keys for scam_reports
    await queryRunner.createForeignKey(
      'scam_reports',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Note: site_id and admin_id foreign keys will be created after sites and admins tables exist
    // Create foreign keys for scam_report_comments
    await queryRunner.createForeignKey(
      'scam_report_comments',
      new TableForeignKey({
        columnNames: ['scam_report_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'scam_reports',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'scam_report_comments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'scam_report_comments',
      new TableForeignKey({
        columnNames: ['parent_comment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'scam_report_comments',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for scam_report_comment_images
    await queryRunner.createForeignKey(
      'scam_report_comment_images',
      new TableForeignKey({
        columnNames: ['comment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'scam_report_comments',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for scam_report_reactions
    await queryRunner.createForeignKey(
      'scam_report_reactions',
      new TableForeignKey({
        columnNames: ['scam_report_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'scam_reports',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'scam_report_reactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for scam_report_site
    await queryRunner.createForeignKey(
      'scam_report_site',
      new TableForeignKey({
        columnNames: ['scam_report_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'scam_reports',
        onDelete: 'CASCADE',
      }),
    );

    // Note: site_id foreign key will be created after sites table is created

    // Create indexes
    await queryRunner.createIndex(
      'scam_reports',
      new TableIndex({
        name: 'IDX_scam_reports_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'scam_report_comments',
      new TableIndex({
        name: 'IDX_scam_report_comments_scam_report_id',
        columnNames: ['scam_report_id'],
      }),
    );

    await queryRunner.createIndex(
      'scam_report_comment_images',
      new TableIndex({
        name: 'IDX_scam_report_comment_images_comment_id',
        columnNames: ['comment_id'],
      }),
    );

    await queryRunner.createIndex(
      'scam_report_reactions',
      new TableIndex({
        name: 'IDX_scam_report_reactions_scam_report_id',
        columnNames: ['scam_report_id'],
      }),
    );

    // Create unique constraint for scam_report_reactions
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_scam_report_reactions_unique" 
      ON "scam_report_reactions" ("scam_report_id", "user_id")
    `);

    await queryRunner.createIndex(
      'scam_report_site',
      new TableIndex({
        name: 'IDX_scam_report_site_scam_report_id',
        columnNames: ['scam_report_id'],
      }),
    );

    // Create unique constraint for scam_report_site
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_scam_report_site_unique" 
      ON "scam_report_site" ("scam_report_id", "site_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_scam_report_site_unique"');
    await queryRunner.dropIndex('scam_report_site', 'IDX_scam_report_site_scam_report_id');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_scam_report_reactions_unique"');
    await queryRunner.dropIndex(
      'scam_report_reactions',
      'IDX_scam_report_reactions_scam_report_id',
    );
    await queryRunner.dropIndex(
      'scam_report_comment_images',
      'IDX_scam_report_comment_images_comment_id',
    );
    await queryRunner.dropIndex(
      'scam_report_comments',
      'IDX_scam_report_comments_scam_report_id',
    );
    await queryRunner.dropIndex('scam_reports', 'IDX_scam_reports_user_id');

    // Drop foreign keys
    const scamReportSiteTable = await queryRunner.getTable('scam_report_site');
    if (scamReportSiteTable) {
      const foreignKeys = scamReportSiteTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('scam_report_site', fk);
      }
    }

    const scamReportReactionsTable = await queryRunner.getTable('scam_report_reactions');
    if (scamReportReactionsTable) {
      const foreignKeys = scamReportReactionsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('scam_report_reactions', fk);
      }
    }

    const scamReportCommentImagesTable = await queryRunner.getTable('scam_report_comment_images');
    if (scamReportCommentImagesTable) {
      const foreignKey = scamReportCommentImagesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('comment_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('scam_report_comment_images', foreignKey);
      }
    }

    const scamReportCommentsTable = await queryRunner.getTable('scam_report_comments');
    if (scamReportCommentsTable) {
      const foreignKeys = scamReportCommentsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('scam_report_comments', fk);
      }
    }

    const scamReportsTable = await queryRunner.getTable('scam_reports');
    if (scamReportsTable) {
      const foreignKey = scamReportsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('scam_reports', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('scam_report_site');
    await queryRunner.dropTable('scam_report_reactions');
    await queryRunner.dropTable('scam_report_comment_images');
    await queryRunner.dropTable('scam_report_comments');
    await queryRunner.dropTable('scam_reports');
  }
}


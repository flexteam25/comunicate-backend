import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSiteSystemPart21765650000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create site_reviews table
    await queryRunner.createTable(
      new Table({
        name: 'site_reviews',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'rating',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
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
            name: 'is_published',
            type: 'boolean',
            isNullable: false,
            default: true,
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

    // Create site_review_comments table
    await queryRunner.createTable(
      new Table({
        name: 'site_review_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'review_id',
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

    // Create site_review_reactions table
    await queryRunner.createTable(
      new Table({
        name: 'site_review_reactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'review_id',
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

    // Create site_views table
    await queryRunner.createTable(
      new Table({
        name: 'site_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
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

    // Create foreign keys for site_reviews
    await queryRunner.createForeignKey(
      'site_reviews',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_reviews',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_review_comments
    await queryRunner.createForeignKey(
      'site_review_comments',
      new TableForeignKey({
        columnNames: ['review_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_reviews',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_review_comments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_review_comments',
      new TableForeignKey({
        columnNames: ['parent_comment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_review_comments',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_review_reactions
    await queryRunner.createForeignKey(
      'site_review_reactions',
      new TableForeignKey({
        columnNames: ['review_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'site_reviews',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_review_reactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for site_views
    await queryRunner.createForeignKey(
      'site_views',
      new TableForeignKey({
        columnNames: ['site_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sites',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_views',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Add check constraint for rating
    await queryRunner.query(`
      ALTER TABLE "site_reviews" 
      ADD CONSTRAINT "CHK_site_reviews_rating" 
      CHECK (rating >= 1 AND rating <= 5)
    `);

    // Create indexes
    await queryRunner.createIndex(
      'site_reviews',
      new TableIndex({
        name: 'IDX_site_reviews_site_id',
        columnNames: ['site_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_reviews',
      new TableIndex({
        name: 'IDX_site_reviews_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create unique constraint for site_reviews
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_site_reviews_unique" 
      ON "site_reviews" ("site_id", "user_id")
    `);

    await queryRunner.createIndex(
      'site_review_comments',
      new TableIndex({
        name: 'IDX_site_review_comments_review_id',
        columnNames: ['review_id'],
      }),
    );

    await queryRunner.createIndex(
      'site_review_reactions',
      new TableIndex({
        name: 'IDX_site_review_reactions_review_id',
        columnNames: ['review_id'],
      }),
    );

    // Create unique constraint for site_review_reactions
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_site_review_reactions_unique" 
      ON "site_review_reactions" ("review_id", "user_id")
    `);

    await queryRunner.createIndex(
      'site_views',
      new TableIndex({
        name: 'IDX_site_views_site_id',
        columnNames: ['site_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "site_reviews" 
      DROP CONSTRAINT IF EXISTS "CHK_site_reviews_rating"
    `);

    // Drop indexes
    await queryRunner.dropIndex('site_views', 'IDX_site_views_site_id');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_site_review_reactions_unique"');
    await queryRunner.dropIndex('site_review_reactions', 'IDX_site_review_reactions_review_id');
    await queryRunner.dropIndex('site_review_comments', 'IDX_site_review_comments_review_id');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_site_reviews_unique"');
    await queryRunner.dropIndex('site_reviews', 'IDX_site_reviews_user_id');
    await queryRunner.dropIndex('site_reviews', 'IDX_site_reviews_site_id');

    // Drop foreign keys
    const siteViewsTable = await queryRunner.getTable('site_views');
    if (siteViewsTable) {
      const foreignKeys = siteViewsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_views', fk);
      }
    }

    const siteReviewReactionsTable = await queryRunner.getTable('site_review_reactions');
    if (siteReviewReactionsTable) {
      const foreignKeys = siteReviewReactionsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_review_reactions', fk);
      }
    }

    const siteReviewCommentsTable = await queryRunner.getTable('site_review_comments');
    if (siteReviewCommentsTable) {
      const foreignKeys = siteReviewCommentsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_review_comments', fk);
      }
    }

    const siteReviewsTable = await queryRunner.getTable('site_reviews');
    if (siteReviewsTable) {
      const foreignKeys = siteReviewsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('site_reviews', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('site_views');
    await queryRunner.dropTable('site_review_reactions');
    await queryRunner.dropTable('site_review_comments');
    await queryRunner.dropTable('site_reviews');
  }
}


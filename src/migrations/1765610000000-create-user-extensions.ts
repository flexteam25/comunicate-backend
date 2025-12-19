import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserExtensions1765610000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create user_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
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
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'birth_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'gender',
            type: 'varchar',
            length: '10',
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

    // Create user_favorite_sites table
    await queryRunner.createTable(
      new Table({
        name: 'user_favorite_sites',
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

    // Create user_posts table
    await queryRunner.createTable(
      new Table({
        name: 'user_posts',
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
            name: 'post_id',
            type: 'uuid',
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

    // Create user_comments table (polymorphic association)
    await queryRunner.createTable(
      new Table({
        name: 'user_comments',
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
            name: 'comment_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment:
              "Type: 'post_comment' | 'site_review_comment' | 'scam_report_comment'",
          },
          {
            name: 'comment_id',
            type: 'uuid',
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

    // Create foreign keys for user_profiles
    await queryRunner.createForeignKey(
      'user_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for user_favorite_sites
    await queryRunner.createForeignKey(
      'user_favorite_sites',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Note: site_id foreign key will be created after sites table is created
    // Create foreign keys for user_posts
    await queryRunner.createForeignKey(
      'user_posts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Note: post_id foreign key will be created after posts table is created
    // Create foreign keys for user_comments
    await queryRunner.createForeignKey(
      'user_comments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Note: comment_id foreign keys will be created after respective comment tables are created
    // Foreign keys for different comment types will be added in their respective migrations

    // Create indexes
    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_user_profiles_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_favorite_sites',
      new TableIndex({
        name: 'IDX_user_favorite_sites_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_favorite_sites',
      new TableIndex({
        name: 'IDX_user_favorite_sites_site_id',
        columnNames: ['site_id'],
      }),
    );

    // Create unique constraint for user_favorite_sites
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_favorite_sites_unique" 
      ON "user_favorite_sites" ("user_id", "site_id")
    `);

    await queryRunner.createIndex(
      'user_posts',
      new TableIndex({
        name: 'IDX_user_posts_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_comments',
      new TableIndex({
        name: 'IDX_user_comments_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_comments',
      new TableIndex({
        name: 'IDX_user_comments_comment_type',
        columnNames: ['comment_type'],
      }),
    );

    await queryRunner.createIndex(
      'user_comments',
      new TableIndex({
        name: 'IDX_user_comments_comment_id',
        columnNames: ['comment_id'],
      }),
    );

    // Create composite index for faster lookups
    await queryRunner.createIndex(
      'user_comments',
      new TableIndex({
        name: 'IDX_user_comments_type_id',
        columnNames: ['comment_type', 'comment_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('user_comments', 'IDX_user_comments_type_id');
    await queryRunner.dropIndex('user_comments', 'IDX_user_comments_comment_id');
    await queryRunner.dropIndex('user_comments', 'IDX_user_comments_comment_type');
    await queryRunner.dropIndex('user_comments', 'IDX_user_comments_user_id');
    await queryRunner.dropIndex('user_posts', 'IDX_user_posts_user_id');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_user_favorite_sites_unique"');
    await queryRunner.dropIndex('user_favorite_sites', 'IDX_user_favorite_sites_site_id');
    await queryRunner.dropIndex('user_favorite_sites', 'IDX_user_favorite_sites_user_id');
    await queryRunner.dropIndex('user_profiles', 'IDX_user_profiles_user_id');

    // Drop foreign keys
    const userCommentsTable = await queryRunner.getTable('user_comments');
    if (userCommentsTable) {
      const foreignKey = userCommentsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_comments', foreignKey);
      }
    }

    const userPostsTable = await queryRunner.getTable('user_posts');
    if (userPostsTable) {
      const foreignKey = userPostsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_posts', foreignKey);
      }
    }

    const userFavoriteSitesTable = await queryRunner.getTable('user_favorite_sites');
    if (userFavoriteSitesTable) {
      const foreignKey = userFavoriteSitesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_favorite_sites', foreignKey);
      }
    }

    const userProfilesTable = await queryRunner.getTable('user_profiles');
    if (userProfilesTable) {
      const foreignKey = userProfilesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_profiles', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('user_comments');
    await queryRunner.dropTable('user_posts');
    await queryRunner.dropTable('user_favorite_sites');
    await queryRunner.dropTable('user_profiles');
  }
}

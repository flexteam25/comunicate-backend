import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreatePostSystem1765620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create post_categories table
    await queryRunner.createTable(
      new Table({
        name: "post_categories",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
            length: "50",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create posts table
    await queryRunner.createTable(
      new Table({
        name: "posts",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "category_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "title",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "content",
            type: "text",
            isNullable: false,
          },
          {
            name: "like_count",
            type: "integer",
            isNullable: false,
            default: 0,
          },
          {
            name: "is_pinned",
            type: "boolean",
            isNullable: false,
            default: false,
          },
          {
            name: "is_published",
            type: "boolean",
            isNullable: false,
            default: false,
          },
          {
            name: "published_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "deleted_at",
            type: "timestamptz",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create post_comments table
    await queryRunner.createTable(
      new Table({
        name: "post_comments",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "post_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "parent_comment_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "content",
            type: "text",
            isNullable: false,
          },
          {
            name: "like_count",
            type: "integer",
            isNullable: false,
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "deleted_at",
            type: "timestamptz",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create post_comment_images table
    await queryRunner.createTable(
      new Table({
        name: "post_comment_images",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "comment_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "image_url",
            type: "varchar",
            length: "500",
            isNullable: false,
          },
          {
            name: "order",
            type: "integer",
            isNullable: false,
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create post_reactions table
    await queryRunner.createTable(
      new Table({
        name: "post_reactions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "post_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "reaction_type",
            type: "varchar",
            length: "10",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create post_views table
    await queryRunner.createTable(
      new Table({
        name: "post_views",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "post_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "ip_address",
            type: "varchar",
            length: "45",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      "posts",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "posts",
      new TableForeignKey({
        columnNames: ["category_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "post_categories",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_comments",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "posts",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_comments",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_comments",
      new TableForeignKey({
        columnNames: ["parent_comment_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "post_comments",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_comment_images",
      new TableForeignKey({
        columnNames: ["comment_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "post_comments",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_reactions",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "posts",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_reactions",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_views",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "posts",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "post_views",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "SET NULL",
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      "posts",
      new TableIndex({
        name: "IDX_posts_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "posts",
      new TableIndex({
        name: "IDX_posts_category_id",
        columnNames: ["category_id"],
      }),
    );

    await queryRunner.createIndex(
      "post_comments",
      new TableIndex({
        name: "IDX_post_comments_post_id",
        columnNames: ["post_id"],
      }),
    );

    await queryRunner.createIndex(
      "post_comments",
      new TableIndex({
        name: "IDX_post_comments_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "post_comment_images",
      new TableIndex({
        name: "IDX_post_comment_images_comment_id",
        columnNames: ["comment_id"],
      }),
    );

    await queryRunner.createIndex(
      "post_reactions",
      new TableIndex({
        name: "IDX_post_reactions_post_id",
        columnNames: ["post_id"],
      }),
    );

    // Create unique constraint for post_reactions
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_post_reactions_unique" 
      ON "post_reactions" ("post_id", "user_id")
    `);

    await queryRunner.createIndex(
      "post_views",
      new TableIndex({
        name: "IDX_post_views_post_id",
        columnNames: ["post_id"],
      }),
    );

    // Update user_posts foreign key
    await queryRunner.createForeignKey(
      "user_posts",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "posts",
        onDelete: "CASCADE",
      }),
    );

    // Note: user_comments uses polymorphic association (comment_type + comment_id)
    // No direct foreign key constraint needed - application layer handles validation
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys from user tables
    // Note: user_comments uses polymorphic association, no foreign key to drop
    const userPostsTable = await queryRunner.getTable("user_posts");
    if (userPostsTable) {
      const foreignKey = userPostsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("post_id") !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("user_posts", foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex("post_views", "IDX_post_views_post_id");
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_post_reactions_unique"');
    await queryRunner.dropIndex("post_reactions", "IDX_post_reactions_post_id");
    await queryRunner.dropIndex(
      "post_comment_images",
      "IDX_post_comment_images_comment_id",
    );
    await queryRunner.dropIndex("post_comments", "IDX_post_comments_user_id");
    await queryRunner.dropIndex("post_comments", "IDX_post_comments_post_id");
    await queryRunner.dropIndex("posts", "IDX_posts_category_id");
    await queryRunner.dropIndex("posts", "IDX_posts_user_id");

    // Drop foreign keys - must drop in correct order
    // First, drop foreign keys that reference post_comments
    const postCommentImagesTable = await queryRunner.getTable(
      "post_comment_images",
    );
    if (postCommentImagesTable) {
      const foreignKey = postCommentImagesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("comment_id") !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("post_comment_images", foreignKey);
      }
    }

    // Then drop foreign keys from post_comments
    const postCommentsTable = await queryRunner.getTable("post_comments");
    if (postCommentsTable) {
      // Drop self-referencing foreign key first (parent_comment_id)
      const parentCommentFk = postCommentsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("parent_comment_id") !== -1,
      );
      if (parentCommentFk) {
        await queryRunner.dropForeignKey("post_comments", parentCommentFk);
      }

      // Drop other foreign keys
      const otherForeignKeys = postCommentsTable.foreignKeys.filter(
        (fk) => fk.columnNames.indexOf("parent_comment_id") === -1,
      );
      for (const fk of otherForeignKeys) {
        await queryRunner.dropForeignKey("post_comments", fk);
      }
    }

    // Drop other foreign keys
    const postViewsTable = await queryRunner.getTable("post_views");
    if (postViewsTable) {
      const foreignKeys = postViewsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey("post_views", fk);
      }
    }

    const postReactionsTable = await queryRunner.getTable("post_reactions");
    if (postReactionsTable) {
      const foreignKeys = postReactionsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey("post_reactions", fk);
      }
    }

    const postsTable = await queryRunner.getTable("posts");
    if (postsTable) {
      const foreignKeys = postsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey("posts", fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable("post_views");
    await queryRunner.dropTable("post_reactions");
    await queryRunner.dropTable("post_comment_images");
    await queryRunner.dropTable("post_comments");
    await queryRunner.dropTable("posts");
    await queryRunner.dropTable("post_categories");
  }
}

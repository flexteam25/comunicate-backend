import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';
import { customAlphabet } from 'nanoid';

export class AddSlugToPosts1769900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add slug column (nullable first)
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'slug',
        type: 'varchar',
        length: '20',
        isNullable: true,
        isUnique: false,
      }),
    );

    // Generate slug for existing posts
    const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
    const posts = await queryRunner.query('SELECT id FROM posts WHERE deleted_at IS NULL');
    
    const usedSlugs = new Set<string>();
    for (const post of posts) {
      let slug = nanoid();
      // Ensure uniqueness
      while (usedSlugs.has(slug)) {
        slug = nanoid();
      }
      usedSlugs.add(slug);
      await queryRunner.query(`UPDATE posts SET slug = $1 WHERE id = $2`, [slug, post.id]);
    }

    // Now make slug NOT NULL and UNIQUE
    await queryRunner.query(`
      ALTER TABLE posts 
      ALTER COLUMN slug SET NOT NULL,
      ADD CONSTRAINT UQ_posts_slug UNIQUE (slug)
    `);

    // Create index on slug
    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'IDX_posts_slug',
        columnNames: ['slug'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('posts', 'IDX_posts_slug');
    await queryRunner.dropColumn('posts', 'slug');
  }
}
